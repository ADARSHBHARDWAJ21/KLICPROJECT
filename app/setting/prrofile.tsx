import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null);
  const [fullName, setFullName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState<string | null>(null);
  const [editingMobile, setEditingMobile] = useState(false);
  const [tempMobile, setTempMobile] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [whatsappUpdates, setWhatsappUpdates] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setEmail(user?.email ?? '');

    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setFullName(data.full_name || '');
        setMobileNumber(data.mobile_num || null);
        setGender(data.gender || null);
        setWhatsappUpdates(data.whatsapp_updates || false);
        setAvatarUrl(data.avatar_url || null);
      }
    }
  };

  const uploadAvatar = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'We need access to your photos to upload an avatar');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && user) {
      setLoading(true);
      const file = result.assets[0];
      const fileExt = file.uri.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      try {
        const response = await fetch(file.uri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, blob, {
            contentType: `image/${fileExt}`,
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          setAvatarUrl(publicUrlData.publicUrl);
          await supabase
            .from('profiles')
            .update({ avatar_url: publicUrlData.publicUrl })
            .eq('id', user.id);
        }
      } catch (error) {
        Alert.alert('Upload Failed', error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveName = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: tempName })
        .eq('id', user.id);

      if (error) throw error;

      setFullName(tempName);
      setEditingName(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMobile = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ mobile_num: tempMobile })
        .eq('id', user.id);

      if (error) throw error;

      setMobileNumber(tempMobile);
      setEditingMobile(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        router.replace('/(auth)/sign-up');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteModalVisible(false);
    setLoading(true);
    try {
      if (!user) return;
      
      // Delete from profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Delete the auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (authError) throw authError;

      router.replace('/(auth)/sign-up');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  const updateWhatsappPreference = async (value: boolean) => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ whatsapp_updates: value })
        .eq('id', user.id);

      if (error) throw error;

      setWhatsappUpdates(value);
    } catch (error) {
      Alert.alert('Error', error.message);
      setWhatsappUpdates(!value); // Revert if error
    } finally {
      setLoading(false);
    }
  };

  const updateGender = async (selectedGender: string) => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ gender: selectedGender })
        .eq('id', user.id);

      if (error) throw error;

      setGender(selectedGender);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.profileSection}>
        {/* Profile Photo Section */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={uploadAvatar} disabled={loading}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#888" />
              </View>
            )}
            <View style={styles.editAvatarBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          
          {/* Name Section with Edit Option */}
          {editingName ? (
            <View style={styles.nameEditContainer}>
              <TextInput
                style={styles.nameInput}
                placeholder="Enter your name"
                value={tempName}
                onChangeText={setTempName}
                autoFocus
              />
              <View style={styles.nameEditButtons}>
                <TouchableOpacity 
                  style={styles.cancelButtonSmall}
                  onPress={() => setEditingName(false)}
                >
                  <Text style={styles.cancelButtonTextSmall}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButtonSmall}
                  onPress={handleSaveName}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonTextSmall}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.nameDisplayContainer}>
              <Text style={styles.profileName}>{fullName || 'Your Name'}</Text>
              <TouchableOpacity 
                onPress={() => {
                  setTempName(fullName);
                  setEditingName(true);
                }}
                style={styles.editNameButton}
              >
                <Ionicons name="pencil" size={16} color="#2196F3" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Email Section */}
        <View style={styles.section}>
          <View>
            <Text style={styles.sectionLabel}>Email address</Text>
            <Text style={styles.sectionValue}>{email}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Mobile Number Section */}
        <View style={styles.section}>
          {editingMobile ? (
            <View style={styles.mobileEditContainer}>
              <Text style={styles.sectionLabel}>Mobile number</Text>
              <TextInput
                style={styles.mobileInput}
                placeholder="Enter mobile number"
                value={tempMobile}
                onChangeText={setTempMobile}
                keyboardType="phone-pad"
                autoFocus
              />
              <View style={styles.mobileEditButtons}>
                <TouchableOpacity 
                  style={styles.cancelButtonSmall}
                  onPress={() => setEditingMobile(false)}
                >
                  <Text style={styles.cancelButtonTextSmall}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButtonSmall}
                  onPress={handleSaveMobile}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonTextSmall}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View>
                <Text style={styles.sectionLabel}>Mobile number</Text>
                <Text style={styles.sectionValue}>
                  {mobileNumber || 'Not provided'}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setTempMobile(mobileNumber || '');
                  setEditingMobile(true);
                }}
              >
                <Text style={styles.editText}>
                  {mobileNumber ? 'Edit' : 'Add'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.divider} />

        {/* Gender Section */}
        <View style={styles.section}>
          <View>
            <Text style={styles.sectionLabel}>Gender</Text>
            <View style={styles.genderOptions}>
              <TouchableOpacity 
                style={[
                  styles.genderOption, 
                  gender === 'female' && styles.genderSelected
                ]}
                onPress={() => updateGender('female')}
                disabled={loading}
              >
                <Text style={[
                  styles.genderText,
                  gender === 'female' && styles.genderSelectedText
                ]}>
                  Female
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.genderOption, 
                  gender === 'male' && styles.genderSelected
                ]}
                onPress={() => updateGender('male')}
                disabled={loading}
              >
                <Text style={[
                  styles.genderText,
                  gender === 'male' && styles.genderSelectedText
                ]}>
                  Male
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* WhatsApp Updates Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Get updates on WhatsApp</Text>
          <Switch
            value={whatsappUpdates}
            onValueChange={updateWhatsappPreference}
            trackColor={{ false: "#e0e0e0", true: "#4CAF50" }}
            thumbColor="#fff"
            disabled={loading}
          />
        </View>

        <View style={styles.divider} />

        {/* Logout Section */}
        <TouchableOpacity 
          style={styles.section}
          onPress={() => setLogoutModalVisible(true)}
        >
          <Text style={[styles.sectionLabel, styles.logoutText]}>Logout</Text>
          <Ionicons name="chevron-forward" size={20} color="#D32F2F" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Delete Account Section */}
        <TouchableOpacity 
          style={styles.section}
          onPress={() => setDeleteModalVisible(true)}
        >
          <Text style={[styles.sectionLabel, styles.deleteText]}>Delete my account</Text>
          <Ionicons name="chevron-forward" size={20} color="#D32F2F" />
        </TouchableOpacity>
      </View>

      {/* Logout Modal */}
      <Modal
        transparent={true}
        visible={logoutModalVisible}
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalText}>Are you sure you want to logout?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleLogout}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        transparent={true}
        visible={deleteModalVisible}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete your account? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.deleteAccountButton]}
                onPress={handleDeleteAccount}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212529',
  },
  profileSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  avatarContainer: {
    alignItems: 'center',
    padding: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 20,
    right: 0,
    backgroundColor: '#2196F3',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
  },
  editNameButton: {
    padding: 4,
  },
  nameEditContainer: {
    width: '100%',
    alignItems: 'center',
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    width: '80%',
    backgroundColor: '#f8f9fa',
    marginBottom: 12,
  },
  nameEditButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginHorizontal: 16,
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    minHeight: 60,
  },
  sectionLabel: {
    fontSize: 16,
    color: '#495057',
    fontWeight: '500',
  },
  sectionValue: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 4,
  },
  editText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  mobileEditContainer: {
    flex: 1,
  },
  mobileInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    backgroundColor: '#f8f9fa',
  },
  mobileEditButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  cancelButtonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  saveButtonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#2196F3',
  },
  cancelButtonTextSmall: {
    color: '#495057',
    fontWeight: '500',
  },
  saveButtonTextSmall: {
    color: '#fff',
    fontWeight: '500',
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  genderOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  genderSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  genderText: {
    color: '#495057',
  },
  genderSelectedText: {
    color: '#fff',
  },
  logoutText: {
    color: '#D32F2F',
  },
  deleteText: {
    color: '#D32F2F',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#212529',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 24,
    color: '#6c757d',
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
  },
  confirmButton: {
    backgroundColor: '#2196F3',
  },
  deleteAccountButton: {
    backgroundColor: '#D32F2F',
  },
  cancelButtonText: {
    color: '#495057',
    fontWeight: '500',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});