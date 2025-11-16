// app/Dashboard/vendor-onboarding.tsx
import useAuth from '@/hooks/useauth';
import { supabase } from '@/lib/supabase';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const VendorOnboarding = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [vendorProfile, setVendorProfile] = useState<any>({
    about_text: '',
    offers: [],
    policies: [],
    price_info: []
  });
  const [images, setImages] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchBusinessProfile();
    }
  }, [user]);

  const fetchBusinessProfile = async () => {
    try {
      const { data } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setProfile(data);
    } catch (error) {
      console.error('Error fetching business profile:', error);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImages([...images, { uri: result.assets[0].uri, caption: '' }]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const updateCaption = (index: number, text: string) => {
    const newImages = [...images];
    newImages[index].caption = text;
    setImages(newImages);
  };

  const addOffer = () => {
    setVendorProfile({
      ...vendorProfile,
      offers: [...vendorProfile.offends, { title: '', description: '' }]
    });
  };

  const updateOffer = (index: number, field: string, value: string) => {
    const newOffers = [...vendorProfile.offers];
    newOffers[index][field] = value;
    setVendorProfile({ ...vendorProfile, offers: newOffers });
  };

  const removeOffer = (index: number) => {
    const newOffers = [...vendorProfile.offers];
    newOffers.splice(index, 1);
    setVendorProfile({ ...vendorProfile, offers: newOffers });
  };

  const addPolicy = () => {
    setVendorProfile({
      ...vendorProfile,
      policies: [...vendorProfile.policies, { title: '', description: '' }]
    });
  };

  const updatePolicy = (index: number, field: string, value: string) => {
    const newPolicies = [...vendorProfile.policies];
    newPolicies[index][field] = value;
    setVendorProfile({ ...vendorProfile, policies: newPolicies });
  };

  const removePolicy = (index: number) => {
    const newPolicies = [...vendorProfile.policies];
    newPolicies.splice(index, 1);
    setVendorProfile({ ...vendorProfile, policies: newPolicies });
  };

  const addPrice = () => {
    setVendorProfile({
      ...vendorProfile,
      price_info: [...vendorProfile.price_info, { service: '', price: '' }]
    });
  };

  const updatePrice = (index: number, field: string, value: string) => {
    const newPrices = [...vendorProfile.price_info];
    newPrices[index][field] = value;
    setVendorProfile({ ...vendorProfile, price_info: newPrices });
  };

  const removePrice = (index: number) => {
    const newPrices = [...vendorProfile.price_info];
    newPrices.splice(index, 1);
    setVendorProfile({ ...vendorProfile, price_info: newPrices });
  };

  const uploadImages = async (vendorProfileId: number) => {
    setUploading(true);
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      // In a real app, you would upload the image to Supabase Storage
      // For this example, we'll just store the local URI
      
      const { error } = await supabase
        .from('vendor_images')
        .insert([
          {
            vendor_profile_id: vendorProfileId,
            image_url: image.uri,
            caption: image.caption,
            display_order: i
          }
        ]);
      
      if (error) {
        console.error('Error saving image:', error);
      }
    }
    
    setUploading(false);
  };

  const submitVendorProfile = async () => {
    if (!vendorProfile.about_text) {
      Alert.alert('Error', 'Please add an about section');
      return;
    }

    setLoading(true);

    try {
      // First create vendor profile
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendor_profiles')
        .insert([
          {
            business_profile_id: profile.id,
            about_text: vendorProfile.about_text,
            offers: vendorProfile.offers,
            policies: vendorProfile.policies,
            price_info: vendorProfile.price_info
          }
        ])
        .select()
        .single();

      if (vendorError) throw vendorError;

      // Upload images
      if (images.length > 0) {
        await uploadImages(vendorData.id);
      }

      // Update business profile to mark as vendor
      const { error: updateError } = await supabase
        .from('business_profiles')
        .update({ 
          is_vendor: true,
          vendor_since: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      Alert.alert(
        'Success', 
        'Your vendor profile has been created successfully!',
        [{ text: 'OK', onPress: () => router.replace('/Dashboard/Dashboards') }]
      );
    } catch (error) {
      console.error('Error creating vendor profile:', error);
      Alert.alert('Error', 'Failed to create vendor profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Become a Wedemption Vendor</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>About Your Business</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell customers about your business, experience, and what makes you special"
          value={vendorProfile.about_text}
          onChangeText={(text) => setVendorProfile({ ...vendorProfile, about_text: text })}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.sectionTitle}>Portfolio Images</Text>
        <Text style={styles.sectionSubtitle}>Upload at least 5 images of your work</Text>
        
        <View style={styles.imageGrid}>
          {images.map((image, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri: image.uri }} style={styles.image} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => removeImage(index)}
              >
                <Feather name="x" size={16} color="#FFF" />
              </TouchableOpacity>
              <TextInput
                style={styles.captionInput}
                placeholder="Image caption"
                value={image.caption}
                onChangeText={(text) => updateCaption(index, text)}
              />
            </View>
          ))}
          
          {images.length < 10 && (
            <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
              <Feather name="plus" size={24} color="#3B82F6" />
              <Text style={styles.addImageText}>Add Image</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Offers & Packages</Text>
        {vendorProfile.offers.map((offer: any, index: number) => (
          <View key={index} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemNumber}>{index + 1}</Text>
              <TouchableOpacity onPress={() => removeOffer(index)}>
                <Feather name="trash-2" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Offer title"
              value={offer.title}
              onChangeText={(text) => updateOffer(index, 'title', text)}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Offer description"
              value={offer.description}
              onChangeText={(text) => updateOffer(index, 'description', text)}
              multiline
              numberOfLines={3}
            />
          </View>
        ))}
        <TouchableOpacity style={styles.addButton} onPress={addOffer}>
          <Feather name="plus" size={20} color="#3B82F6" />
          <Text style={styles.addButtonText}>Add Offer</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Business Policies</Text>
        {vendorProfile.policies.map((policy: any, index: number) => (
          <View key={index} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemNumber}>{index + 1}</Text>
              <TouchableOpacity onPress={() => removePolicy(index)}>
                <Feather name="trash-2" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Policy title"
              value={policy.title}
              onChangeText={(text) => updatePolicy(index, 'title', text)}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Policy description"
              value={policy.description}
              onChangeText={(text) => updatePolicy(index, 'description', text)}
              multiline
              numberOfLines={3}
            />
          </View>
        ))}
        <TouchableOpacity style={styles.addButton} onPress={addPolicy}>
          <Feather name="plus" size={20} color="#3B82F6" />
          <Text style={styles.addButtonText}>Add Policy</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Pricing Information</Text>
        {vendorProfile.price_info.map((price: any, index: number) => (
          <View key={index} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemNumber}>{index + 1}</Text>
              <TouchableOpacity onPress={() => removePrice(index)}>
                <Feather name="trash-2" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Service name"
              value={price.service}
              onChangeText={(text) => updatePrice(index, 'service', text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Price"
              value={price.price}
              onChangeText={(text) => updatePrice(index, 'price', text)}
              keyboardType="numeric"
            />
          </View>
        ))}
        <TouchableOpacity style={styles.addButton} onPress={addPrice}>
          <Feather name="plus" size={20} color="#3B82F6" />
          <Text style={styles.addButtonText}>Add Price</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={submitVendorProfile}
          disabled={loading || uploading}
        >
          {loading || uploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Become a Vendor</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  imageContainer: {
    width: '47%',
    marginBottom: 16,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
    fontSize: 12,
  },
  addImageButton: {
    width: '47%',
    height: 120,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    color: '#3B82F6',
    marginTop: 8,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    fontWeight: '600',
    color: '#6B7280',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 24,
  },
  addButtonText: {
    color: '#3B82F6',
    marginLeft: 8,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VendorOnboarding;