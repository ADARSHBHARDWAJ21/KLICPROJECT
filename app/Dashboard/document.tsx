import useAuth from '@/hooks/useauth';
import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Button, ProgressBar, TextInput } from 'react-native-paper';

interface VerificationData {
  business_name: string;
  contact_name: string;
  business_address: string;
  contact_number: string;
  gst_number: string;
  pan_card_number: string;
  identity_document_url: string;
}

export default function DocumentVerificationScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  
  const [formData, setFormData] = useState<VerificationData>({
    business_name: '',
    contact_name: '',
    business_address: '',
    contact_number: '',
    gst_number: '',
    pan_card_number: '',
    identity_document_url: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    checkExistingSubmission();
  }, []);

  const checkExistingSubmission = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('vendor_verification_documents')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setSubmitted(true);
        setIsApproved(data.approved);
        setFormData({
          business_name: data.business_name,
          contact_name: data.contact_name,
          business_address: data.business_address,
          contact_number: data.contact_number,
          gst_number: data.gst_number,
          pan_card_number: data.pan_card_number,
          identity_document_url: data.identity_document_url,
        });
      }
    } catch (error) {
      console.log('No existing submission found');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.business_name.trim()) newErrors.business_name = 'Business name is required';
    if (!formData.contact_name.trim()) newErrors.contact_name = 'Contact name is required';
    if (!formData.business_address.trim()) newErrors.business_address = 'Business address is required';
    if (!formData.contact_number.trim()) newErrors.contact_number = 'Contact number is required';
    
    // Validate GST number format (basic validation)
    if (!formData.gst_number.trim()) {
      newErrors.gst_number = 'GST number is required';
    } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_number)) {
      newErrors.gst_number = 'Please enter a valid GST number';
    }
    
    // Validate PAN card format
    if (!formData.pan_card_number.trim()) {
      newErrors.pan_card_number = 'PAN card number is required';
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_card_number)) {
      newErrors.pan_card_number = 'Please enter a valid PAN number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDocumentUpload = async () => {
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `verification-docs/${user.id}/${fileName}`;

      // Read the file as base64
      const fileContent = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert to blob
      const contentType = file.mimeType || 'application/octet-stream';
      const blob = await fetch(`data:${contentType};base64,${fileContent}`).then(res => res.blob());

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(filePath, blob, {
          contentType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, identity_document_url: publicUrl }));
      setErrors(prev => ({ ...prev, identity_document: '' }));

    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = () => {
    setFormData(prev => ({ ...prev, identity_document_url: '' }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    Alert.alert(
      'Important Notice',
      'Please review your information carefully. This information cannot be edited after submission. Are you sure you want to submit?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Submit', 
          style: 'destructive',
          onPress: async () => {
            if (!validateForm()) return;

            setLoading(true);
            try {
              const { error } = await supabase
                .from('vendor_verification_documents')
                .upsert({
                  user_id: user.id,
                  ...formData,
                  submitted_at: new Date().toISOString(),
                  approved: false, // Default to false when submitting
                });

              if (error) throw error;

              setSubmitted(true);
              setIsApproved(false);
              Alert.alert(
                'Success', 
                'Your documents have been submitted for verification. You cannot edit this information now.'
              );
            } catch (error) {
              console.error('Submission error:', error);
              Alert.alert('Error', 'Failed to submit documents');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (submitted) {
    // Determine status based on boolean approved value
    let statusDisplay;
    if (isApproved === true) {
      statusDisplay = {
        icon: 'check-circle',
        color: '#4CAF50',
        title: 'Verification Approved!',
        message: 'You are now eligible for becoming a verified vendor on our platform.',
        button: (
          <Button 
            mode="contained" 
            onPress={() => router.replace('./dashboards')}
            style={styles.dashboardButton}
          >
            Go to Dashboard
          </Button>
        )
      };
    } else if (isApproved === false) {
      statusDisplay = {
        icon: 'schedule',
        color: '#FF9800',
        title: 'Verification in Progress',
        message: 'We are verifying your business details. This may take 1-2 business days.',
        button: null
      };
    } else {
      // This case shouldn't normally happen, but handling for completeness
      statusDisplay = {
        icon: 'help',
        color: '#64748B',
        title: 'Status Unknown',
        message: 'Unable to determine your verification status. Please contact support.',
        button: (
          <Button 
            mode="outlined" 
            onPress={() => router.replace('/support')}
            style={styles.supportButton}
          >
            Contact Support
          </Button>
        )
      };
    }

    return (
      <View style={styles.container}>
        <View style={styles.statusContainer}>
          <MaterialIcons 
            name={statusDisplay.icon} 
            size={64} 
            color={statusDisplay.color} 
          />
          <Text style={styles.statusTitle}>
            {statusDisplay.title}
          </Text>
          <Text style={styles.statusMessage}>
            {statusDisplay.message}
          </Text>
          {statusDisplay.button}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Business Verification</Text>
        <Text style={styles.subtitle}>
          Complete your business profile to become a verified vendor
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Step 1 of 3</Text>
        <ProgressBar progress={0.33} color="#6366F1" style={styles.progressBar} />
      </View>

      <View style={styles.formContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Business Name</Text>
            <TextInput
              value={formData.business_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, business_name: text }))}
              style={styles.input}
              mode="outlined"
              error={!!errors.business_name}
              outlineColor="#E2E8F0"
              activeOutlineColor="#6366F1"
            />
            {errors.business_name && <Text style={styles.errorText}>{errors.business_name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contact Name</Text>
            <TextInput
              value={formData.contact_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, contact_name: text }))}
              style={styles.input}
              mode="outlined"
              error={!!errors.contact_name}
              outlineColor="#E2E8F0"
              activeOutlineColor="#6366F1"
            />
            {errors.contact_name && <Text style={styles.errorText}>{errors.contact_name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Business Address</Text>
            <TextInput
              value={formData.business_address}
              onChangeText={(text) => setFormData(prev => ({ ...prev, business_address: text }))}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={3}
              error={!!errors.business_address}
              outlineColor="#E2E8F0"
              activeOutlineColor="#6366F1"
            />
            {errors.business_address && <Text style={styles.errorText}>{errors.business_address}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contact Number</Text>
            <TextInput
              value={formData.contact_number}
              onChangeText={(text) => setFormData(prev => ({ ...prev, contact_number: text }))}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
              error={!!errors.contact_number}
              outlineColor="#E2E8F0"
              activeOutlineColor="#6366F1"
            />
            {errors.contact_number && <Text style={styles.errorText}>{errors.contact_number}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>GST Number</Text>
            <TextInput
              value={formData.gst_number}
              onChangeText={(text) => setFormData(prev => ({ ...prev, gst_number: text.toUpperCase() }))}
              style={styles.input}
              mode="outlined"
              error={!!errors.gst_number}
              outlineColor="#E2E8F0"
              activeOutlineColor="#6366F1"
              maxLength={15}
            />
            {errors.gst_number && <Text style={styles.errorText}>{errors.gst_number}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PAN Card Number</Text>
            <TextInput
              value={formData.pan_card_number}
              onChangeText={(text) => setFormData(prev => ({ ...prev, pan_card_number: text.toUpperCase() }))}
              style={styles.input}
              mode="outlined"
              error={!!errors.pan_card_number}
              outlineColor="#E2E8F0"
              activeOutlineColor="#6366F1"
              maxLength={10}
            />
            {errors.pan_card_number && <Text style={styles.errorText}>{errors.pan_card_number}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Documents (Optional)</Text>
          
          <View style={styles.uploadSection}>
            <Text style={styles.inputLabel}>Identity Document</Text>
            <Text style={styles.optionalText}>Optional - Upload if available</Text>
            
            {formData.identity_document_url ? (
              <View style={styles.uploadedFileContainer}>
                <View style={styles.uploadedFileInfo}>
                  <MaterialIcons name="description" size={20} color="#6366F1" />
                  <Text style={styles.uploadedFileName}>Document uploaded</Text>
                </View>
                <TouchableOpacity onPress={removeDocument} style={styles.removeButton}>
                  <MaterialIcons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleDocumentUpload}
                  disabled={uploading}
                  style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                >
                  {uploading ? (
                    <Text style={styles.uploadButtonText}>Uploading...</Text>
                  ) : (
                    <>
                      <MaterialIcons name="cloud-upload" size={20} color="#6366F1" />
                      <Text style={styles.uploadButtonText}>Upload Document</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={styles.uploadHint}>Supported formats: PDF, PNG, JPG (Max 5MB)</Text>
              </>
            )}
          </View>
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
        >
          Submit for Verification
        </Button>

        <View style={styles.disclaimerContainer}>
          <MaterialIcons name="warning" size={20} color="#F59E0B" />
          <Text style={styles.disclaimer}>
            Once submitted, you cannot edit these details. Please verify all information is correct before submitting.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
  },
  progressContainer: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  progressText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  formContainer: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  optionalText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  uploadSection: {
    marginBottom: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    color: '#6366F1',
    fontWeight: '500',
  },
  uploadHint: {
    color: '#64748B',
    fontSize: 12,
  },
  uploadedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  uploadedFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadedFileName: {
    color: '#374151',
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 8,
    shadowColor: 'transparent',
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  disclaimer: {
    flex: 1,
    color: '#92400E',
    fontSize: 14,
    lineHeight: 20,
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  dashboardButton: {
    marginTop: 16,
    borderRadius: 8,
    paddingHorizontal: 24,
  },
  supportButton: {
    marginTop: 16,
    borderRadius: 8,
    paddingHorizontal: 24,
    borderColor: '#6366F1',
  },
});