import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, HelperText, ProgressBar, TextInput } from 'react-native-paper';
import useAuth from "../../hooks/useauth";

interface BusinessProfile {
  id?: string;
  user_id?: string;
  business_name: string;
  contact_person: string;
  email: string;
  phone: string;
  whatsapp_num: number;
  address: string;
  city_id: number | null;
  years_experience: number;
  website_url: string;
  instagram_handle: string;
  facebook_handle: string;
  youtube_handle: string;
  service_id: number | null;
  price_range: string;
  portfolio_images: string[];
  portfolio_links: string[];
  overtime_charges: string;
  about_brand: string;
  why_choose_us: string;
  exclusive_deals: string;
  is_approved: boolean;
  completion_percentage: number;
  user_cancellation_policy: string;
  vendor_cancellation_policy: string;
  vendor_cancellation_terms: string;
  payment_terms: string;
  package_details: string;
  created_at?: string;
  updated_at?: string;
}

const CANCELLATION_OPTIONS = [
  'Please Select',
  'Partial Refund Offered',
  'No Refund Offered',
  'No Refund Offered However Date Adjustment Can Be Done',
  'Full Refund Offered'
];
const PAYMENT_TERMS_OPTIONS = [
  'Please Select',
  'Upto 25% Advance',
  'Approx 50% Advance while booking',
  '100% Advance while booking'
];

export default function BusinessProfileSetupScreen({ isEditing = false }: { isEditing?: boolean }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [cities, setCities] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [profile, setProfile] = useState<BusinessProfile>({
    business_name: '',
    contact_person: '',
    email: user?.email || '',
    phone: '',
    whatsapp_num: 0,
    address: '',
    city_id: null,
    years_experience: 0,
    website_url: '',
    instagram_handle: '',
    facebook_handle: '',
    youtube_handle: '',
    service_id: null,
    price_range: '',
    portfolio_images: [],
    portfolio_links: [],
    overtime_charges: '',
    about_brand: '',
    why_choose_us: '',
    exclusive_deals: '',
    is_approved: false,
    completion_percentage: 0,
    user_cancellation_policy: 'Please Select',
    vendor_cancellation_policy: 'Please Select',
    vendor_cancellation_terms: '',
    payment_terms: 'Please Select',
    package_details: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        // First load cities and services
        await Promise.all([
          fetchCities(),
          fetchServices()
        ]);
        
        // Then fetch profile data if user exists
        if (user) {
          await fetchProfile();
        }
      } catch (error) {
        console.error('Initialization error:', error);
        Alert.alert('Error', 'Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const fetchProfile = async () => {
    try {
      if (!user) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        // Handle portfolio_images conversion from string to array if needed
        let portfolioImages = [];
        if (data.portfolio_images && typeof data.portfolio_images === 'string') {
          try {
            portfolioImages = JSON.parse(data.portfolio_images.replace(/{/g, '[').replace(/}/g, ']'));
          } catch (e) {
            console.error('Error parsing portfolio images:', e);
          }
        } else if (Array.isArray(data.portfolio_images)) {
          portfolioImages = data.portfolio_images;
        }
        
        setProfile({
          ...data,
          portfolio_images: portfolioImages,
          email: data.email || user.email || '',
          portfolio_links: data.portfolio_links || '',
          vendor_cancellation_terms: data.vendor_cancellation_terms || '',
          package_details: data.package_details || '',
          whatsapp_num: data.whatsapp_num || 0,
        });
        
        // Only redirect if we're NOT in edit mode AND profile is complete
        if (!isEditing && data.completion_percentage >= 80) {
          router.replace('./Dashboard');
        }
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase.from('cities').select('*');
      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase.from('services').select('*');
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!profile.business_name.trim()) newErrors.business_name = 'Business name is required';
      if (!profile.contact_person.trim()) newErrors.contact_person = 'Contact person is required';
      if (!profile.email.trim()) newErrors.email = 'Email is required';
      if (!profile.phone.trim()) newErrors.phone = 'Phone number is required';
      if (!profile.whatsapp_num) newErrors.whatsapp_num = 'WhatsApp number is required'; // Add this line
      if (!profile.address.trim()) newErrors.address = 'Address is required';
      if (!profile.city_id) newErrors.city_id = 'City is required';
      if (!profile.service_id) newErrors.primary_service_id = 'Primary service is required';
    }
    
    if (step === 2) {
      if (!profile.price_range.trim()) newErrors.price_range = 'Price range is required';
    }
    
    if (step === 4) {
      if (profile.user_cancellation_policy === 'Please Select') newErrors.user_cancellation_policy = 'Cancellation policy is required';
      if (profile.vendor_cancellation_policy === 'Please Select') newErrors.vendor_cancellation_policy = 'Vendor cancellation policy is required';
      if (profile.payment_terms === 'Please Select') newErrors.payment_terms = 'Payment terms are required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSave();
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Prepare data for database - ensure portfolio_images is properly formatted
      const updates = {
        ...profile,
        // Convert array to PostgreSQL array format
        portfolio_images: profile.portfolio_images.length > 0 ? 
          `{${profile.portfolio_images.map(img => `"${img}"`).join(',')}}` : 
          null,
        user_id: user.id,
        updated_at: new Date().toISOString(),
        completion_percentage: calculateCompletionPercentage(),
      };

      const { error } = await supabase
        .from('business_profiles')
        .upsert(updates);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (isEditing) {
        router.back();
      } else {
        router.replace('./Dashboards');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletionPercentage = (): number => {
    let completedFields = 0;
    const totalFields = 25;
    
    // Count completed fields
    if (profile.business_name.trim()) completedFields++;
    if (profile.contact_person.trim()) completedFields++;
    if (profile.email.trim()) completedFields++;
    if (profile.phone.trim()) completedFields++;
    if (profile.whatsapp_num > 0) completedFields++; 
    if (profile.address.trim()) completedFields++;
    if (profile.city_id) completedFields++;
    if (profile.service_id) completedFields++;
    if (profile.years_experience > 0) completedFields++;
    if (profile.website_url.trim()) completedFields++;
    if (profile.instagram_handle.trim()) completedFields++;
    if (profile.facebook_handle.trim()) completedFields++;
    if (profile.youtube_handle.trim()) completedFields++;
    if (profile.price_range.trim()) completedFields++;
    if (profile.portfolio_images.length > 0) completedFields++;
    if (profile.portfolio_links.length) completedFields++;
    if (profile.overtime_charges.trim()) completedFields++;
    if (profile.about_brand.trim()) completedFields++;
    if (profile.why_choose_us.trim()) completedFields++;
    if (profile.exclusive_deals.trim()) completedFields++;
    if (profile.user_cancellation_policy !== 'Please Select') completedFields++;
    if (profile.vendor_cancellation_policy !== 'Please Select') completedFields++;
    if (profile.vendor_cancellation_terms.trim()) completedFields++;
    if (profile.payment_terms !== 'Please Select') completedFields++;
    if (profile.package_details.trim()) completedFields++;
    
    return Math.round((completedFields / totalFields) * 100);
  };

  const handleImageUpload = async () => {
    if (!user) return;
    
    try {
      setUploadingImages(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets) return;

      const uploadedUrls: string[] = [];
      
      for (const asset of result.assets) {
        const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `user_${user.id}/${fileName}`;

        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const { data, error: uploadError } = await supabase
          .storage
          .from('portfolio-images')
          .upload(filePath, blob);

        if (uploadError) throw uploadError;

        if (data) {
          const { data: { publicUrl } } = supabase
            .storage
            .from('portfolio-images')
            .getPublicUrl(data.path);
          uploadedUrls.push(publicUrl);
        }
      }

      // Update portfolio images (stored as array)
      setProfile(prev => ({
        ...prev,
        portfolio_images: [...prev.portfolio_images, ...uploadedUrls],
      }));
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Error', 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>PROFILE COMPLETION {profile.completion_percentage}%</Text>
        <ProgressBar
          progress={profile.completion_percentage / 100}
          color="#FF5A5F"
          style={styles.progressBar}
        />
        <Text style={styles.stepIndicatorText}>Step {currentStep} of 4</Text>
      </View>
    );
  };

  const renderStep1 = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.sectionTitle}>Basic Business Information</Text>
      <Text style={styles.sectionDescription}>
        Provide essential details about your business to help clients find and connect with you.
      </Text>
      
      <Text style={styles.inputLabel}>Business Name *</Text>
      <TextInput
        value={profile.business_name}
        onChangeText={(text) => setProfile({...profile, business_name: text})}
        style={styles.input}
        error={!!errors.business_name}
        mode="outlined"
        placeholder="Enter your business name"
      />
      <HelperText type="error" visible={!!errors.business_name}>
        {errors.business_name}
      </HelperText>
      
      <Text style={styles.inputLabel}>Name *</Text>
      <TextInput
        value={profile.contact_person}
        onChangeText={(text) => setProfile({...profile, contact_person: text})}
        style={styles.input}
        error={!!errors.contact_person}
        mode="outlined"
        placeholder="Enter person's name"
      />
      <HelperText type="error" visible={!!errors.contact_person}>
        {errors.contact_person}
      </HelperText>
      
      <Text style={styles.inputLabel}>Email Address *</Text>
      <TextInput
        value={profile.email}
        onChangeText={(text) => setProfile({...profile, email: text})}
        style={styles.input}
        keyboardType="email-address"
        error={!!errors.email}
        mode="outlined"
        placeholder="Enter your business email"
      />
      <HelperText type="error" visible={!!errors.email}>
        {errors.email}
      </HelperText>
      
      <Text style={styles.inputLabel}>Mobile Number *</Text>
      <TextInput
        value={profile.phone}
        onChangeText={(text) => setProfile({...profile, phone: text})}
        style={styles.input}
        keyboardType="phone-pad"
        error={!!errors.phone}
        mode="outlined"
        placeholder="Enter your business phone number"
      />
      <HelperText type="error" visible={!!errors.phone}>
        {errors.phone}
      </HelperText>

      <Text style={styles.inputLabel}>WhatsApp Number *</Text>
    <TextInput
      value={profile.whatsapp_num ? profile.whatsapp_num.toString() : ''}
      onChangeText={(text) => setProfile({...profile, whatsapp_num: parseInt(text) || null})}
      style={styles.input}
      keyboardType="phone-pad"
      error={!!errors.whatsapp_num}
      mode="outlined"
      placeholder="Enter your WhatsApp number"
    />
    <HelperText type="error" visible={!!errors.whatsapp_num}>
      {errors.whatsapp_num}
    </HelperText>
    

      
      <Text style={styles.inputLabel}>Business Address *</Text>
      <TextInput
        value={profile.address}
        onChangeText={(text) => setProfile({...profile, address: text})}
        style={styles.input}
        multiline
        error={!!errors.address}
        mode="outlined"
        numberOfLines={3}
        placeholder="Enter your business address"
      />
      <HelperText type="error" visible={!!errors.address}>
        {errors.address}
      </HelperText>
      
      <Text style={styles.inputLabel}>City *</Text>
      <View style={[styles.pickerContainer, errors.city_id ? styles.pickerError : null]}>
        <Picker
          selectedValue={profile.city_id}
          onValueChange={(itemValue) => setProfile({...profile, city_id: itemValue})}
          style={styles.picker}
        >
          <Picker.Item label="Select your city" value={null} />
          {cities.map(city => (
            <Picker.Item key={city.id} label={city.name} value={city.id} />
          ))}
        </Picker>
      </View>
      {errors.city_id && (
        <HelperText type="error" visible={!!errors.city_id}>
          {errors.city_id}
        </HelperText>
      )}
      
      <Text style={styles.inputLabel}>Service Category *</Text>
      <View style={[styles.pickerContainer, errors.primary_service_id ? styles.pickerError : null]}>
        <Picker
          selectedValue={profile.service_id}
          onValueChange={(itemValue) => setProfile({...profile, service_id: itemValue})}
          style={styles.picker}
        >
          <Picker.Item label="Select service" value={null} />
          {services.map(service => (
            <Picker.Item key={service.id} label={service.name} value={service.id} />
          ))}
        </Picker>
      </View>
      {errors.primary_service_id && (
        <HelperText type="error" visible={!!errors.primary_service_id}>
          {errors.primary_service_id}
        </HelperText>
      )}
      
      <Text style={styles.inputLabel}>Years of Experience</Text>
      <TextInput
        value={profile.years_experience.toString()}
        onChangeText={(text) => setProfile({...profile, years_experience: parseInt(text) || 0})}
        style={styles.input}
        keyboardType="numeric"
        mode="outlined"
        placeholder="Enter years of experience"
      />
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.sectionTitle}>Online Presence & Service Details</Text>
      <Text style={styles.sectionDescription}>
        Share your digital footprint and service information to help clients learn more about your work.
      </Text>
      
      <Text style={styles.subSectionTitle}>Social Media Profiles</Text>
      
      <Text style={styles.inputLabel}>Website URL</Text>
      <TextInput
        value={profile.website_url}
        onChangeText={(text) => setProfile({...profile, website_url: text})}
        style={styles.input}
        mode="outlined"
        placeholder="https://yourwebsite.com"
      />
      
      <Text style={styles.inputLabel}>Instagram Handle</Text>
      <TextInput
        value={profile.instagram_handle}
        onChangeText={(text) => setProfile({...profile, instagram_handle: text})}
        style={styles.input}
        mode="outlined"
        placeholder="@yourusername"
      />
      
      <Text style={styles.inputLabel}>Facebook Page</Text>
      <TextInput
        value={profile.facebook_handle}
        onChangeText={(text) => setProfile({...profile, facebook_handle: text})}
        style={styles.input}
        mode="outlined"
        placeholder="YourPageName"
      />
      
      <Text style={styles.inputLabel}>YouTube Channel</Text>
      <TextInput
        value={profile.youtube_handle}
        onChangeText={(text) => setProfile({...profile, youtube_handle: text})}
        style={styles.input}
        mode="outlined"
        placeholder="Channel Name or URL"
      />
      
      <Text style={styles.subSectionTitle}>Service Pricing</Text>
      
      <Text style={styles.inputLabel}>Starting Price Range *</Text>
      <TextInput
        value={profile.price_range}
        onChangeText={(text) => setProfile({...profile, price_range: text})}
        style={styles.input}
        error={!!errors.price_range}
        mode="outlined"
        placeholder="e.g., ₹10,000 - ₹50,000"
      />
      <HelperText type="error" visible={!!errors.price_range}>
        {errors.price_range}
      </HelperText>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.sectionTitle}>Portfolio Showcase</Text>
      <Text style={styles.sectionDescription}>
        Showcase your best work to attract potential clients. Upload high-quality images and share links to your online portfolios.
      </Text>
      
      <Button
        mode="contained"
        onPress={handleImageUpload}
        loading={uploadingImages}
        disabled={uploadingImages}
        style={styles.uploadButton}
        icon="cloud-upload"
      >
        {uploadingImages ? 'Uploading Images...' : 'Upload Portfolio Images'}
      </Button>
      
      {profile.portfolio_images.length > 0 ? (
        <View style={styles.imageGrid}>
          {profile.portfolio_images.map((uri, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri }} style={styles.portfolioImage} />
              <TouchableOpacity
                style={styles.deleteImageButton}
                onPress={() => {
                  const images = [...profile.portfolio_images];
                  images.splice(index, 1);
                  setProfile({...profile, portfolio_images: images});
                }}
              >
                <MaterialIcons name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyPortfolio}>
          <MaterialIcons name="collections" size={48} color="#ccc" />
          <Text style={styles.emptyPortfolioText}>No portfolio images uploaded yet</Text>
          <Text style={styles.emptyPortfolioSubText}>Upload your best work to showcase your skills</Text>
        </View>
      )}
      
      <Text style={styles.subSectionTitle}>Portfolio Links</Text>
      <Text style={styles.inputLabel}>External Portfolio Links (comma-separated)</Text>
      <TextInput
        value={profile.portfolio_links}
        onChangeText={(text) => setProfile({...profile, portfolio_links: text})}
        style={styles.input}
        multiline
        mode="outlined"
        numberOfLines={3}
        placeholder=""
      />
      
      <Text style={styles.subSectionTitle}>Additional Service Information</Text>
      <Text style={styles.inputLabel}>Overtime Charges (per hour)</Text>
      <TextInput
        value={profile.overtime_charges}
        onChangeText={(text) => setProfile({...profile, overtime_charges: text})}
        style={styles.input}
        mode="outlined"
        placeholder="e.g., ₹1,000 per hour"
      />
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.sectionTitle}>Business Policies & Brand Information</Text>
      <Text style={styles.sectionDescription}>
        Define your business policies and share information about your brand to build trust with potential clients.
      </Text>
      
      <View style={styles.customerFacingSection}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="visibility" size={20} color="#FF5A5F" />
          <Text style={styles.sectionHeaderText}>
            This section will be visible to customers. Please provide detailed and appealing information to increase your leads.
          </Text>
        </View>
        
        <Text style={styles.subSectionTitle}>Package Details</Text>
        <Text style={styles.inputLabel}>Package Details & Pricing Structure</Text>
        <TextInput
          value={profile.package_details}
          onChangeText={(text) => setProfile({...profile, package_details: text})}
          style={[styles.input, styles.largeInput]}
          multiline
          mode="outlined"
          numberOfLines={6}
          placeholder="Describe your packages, what's included in each, and their respective prices. Be as detailed as possible to attract customers."
        />
        
        <Text style={styles.subSectionTitle}>About Your Brand</Text>
        <Text style={styles.inputLabel}>Tell Your Story</Text>
        <TextInput
          value={profile.about_brand}
          onChangeText={(text) => setProfile({...profile, about_brand: text})}
          style={[styles.input, styles.largeInput]}
          multiline
          mode="outlined"
          numberOfLines={6}
          placeholder="Tell your brand story, your philosophy, what makes you unique, and why customers should choose you. This is your chance to make a great first impression!"
        />
        
        <Text style={styles.subSectionTitle}>Exclusive Offers</Text>
        <Text style={styles.inputLabel}>Special Deals & Promotions</Text>
        <TextInput
          value={profile.exclusive_deals}
          onChangeText={(text) => setProfile({...profile, exclusive_deals: text})}
          style={[styles.input, styles.largeInput]}
          multiline
          mode="outlined"
          numberOfLines={4}
          placeholder="Describe any special offers, seasonal discounts, package deals, or promotions you're currently running. This can be a great way to attract new customers!"
        />
        
        <Text style={styles.subSectionTitle}>Why Choose Us?</Text>
        <Text style={styles.inputLabel}>Your Unique Value Proposition</Text>
        <TextInput
          value={profile.why_choose_us}
          onChangeText={(text) => setProfile({...profile, why_choose_us: text})}
          style={[styles.input, styles.largeInput]}
          multiline
          mode="outlined"
          numberOfLines={4}
          placeholder="Highlight your unique selling points, competitive advantages, awards, certifications, or anything else that sets you apart from competitors."
        />
      </View>
      
      <Text style={styles.subSectionTitle}>Cancellation Policies</Text>
      
      <Text style={styles.inputLabel}>Customer Cancellation Policy *</Text>
      <Text style={styles.inputSubLabel}>Please describe your cancellation policy "if customer initiates a cancellation" including whether you provide refunds of booking amounts and terms for doing so</Text>
      <View style={[styles.pickerContainer, errors.user_cancellation_policy ? styles.pickerError : null]}>
        <Picker
          selectedValue={profile.user_cancellation_policy}
          onValueChange={(itemValue) => setProfile({...profile, user_cancellation_policy: itemValue})}
        >
          {CANCELLATION_OPTIONS.map(option => (
            <Picker.Item key={option} label={option} value={option} />
          ))}
        </Picker>
      </View>
      {errors.user_cancellation_policy && (
        <HelperText type="error" visible={!!errors.user_cancellation_policy}>
          {errors.user_cancellation_policy}
        </HelperText>
      )}
      
      <Text style={styles.inputLabel}>Vendor Cancellation Policy *</Text>
      <Text style={styles.inputSubLabel}>Please describe your cancellation policy "if you initiate a cancellation" including whether you provide refunds of booking amounts and terms for doing so</Text>
      <View style={[styles.pickerContainer, errors.vendor_cancellation_policy ? styles.pickerError : null]}>
        <Picker
          selectedValue={profile.vendor_cancellation_policy}
          onValueChange={(itemValue) => setProfile({...profile, vendor_cancellation_policy: itemValue})}
        >
          {CANCELLATION_OPTIONS.map(option => (
            <Picker.Item key={option} label={option} value={option} />
          ))}
        </Picker>
      </View>
      {errors.vendor_cancellation_policy && (
        <HelperText type="error" visible={!!errors.vendor_cancellation_policy}>
          {errors.vendor_cancellation_policy}
        </HelperText>
      )}
      
      <Text style={styles.inputLabel}>Cancellation Terms & Conditions</Text>
      <TextInput
        value={profile.vendor_cancellation_terms}
        onChangeText={(text) => setProfile({...profile, vendor_cancellation_terms: text})}
        style={[styles.input, styles.largeInput]}
        multiline
        mode="outlined"
        numberOfLines={4}
        placeholder="Explain the terms under which you might need to cancel a booking and how you handle such situations"
      />
      
      <Text style={styles.inputLabel}>Payment Terms *</Text>
      <View style={[styles.pickerContainer, errors.payment_terms ? styles.pickerError : null]}>
        <Picker
          selectedValue={profile.payment_terms}
          onValueChange={(itemValue) => setProfile({...profile, payment_terms: itemValue})}
        >
          {PAYMENT_TERMS_OPTIONS.map(option => (
            <Picker.Item key={option} label={option} value={option} />
          ))}
        </Picker>
      </View>
      {errors.payment_terms && (
        <HelperText type="error" visible={!!errors.payment_terms}>
          {errors.payment_terms}
        </HelperText>
      )}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#FF5A5F" />
        <Text style={styles.loadingText}>
          {isEditing ? 'Loading your profile...' : 'Setting up your profile...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Business Profile' : 'Business Profile Setup'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {renderStepIndicator()}

      <View style={styles.contentContainer}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </View>

      <View style={styles.buttonContainer}>
        {currentStep > 1 && (
          <Button
            mode="outlined"
            onPress={() => setCurrentStep(currentStep - 1)}
            style={[styles.button, styles.backButton]}
            labelStyle={styles.buttonLabel}
          >
            Back
          </Button>
        )}
        
        <Button
          mode="contained"
          onPress={handleNextStep}
          style={[styles.button, styles.nextButton]}
          loading={loading}
          disabled={loading}
          labelStyle={styles.buttonLabel}
        >
          {currentStep === 4 ? (isEditing ? 'Update Profile' : 'Complete Setup') : 'Next'}
        </Button>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fafafa',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#fafafa',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#444',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  stepIndicatorText: {
    fontSize: 12,
    color: '#777',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stepContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    color: '#222',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
    color: '#333',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 4,
    color: '#444',
  },
  inputSubLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 6,
  },
  largeInput: {
    minHeight: 120,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  pickerError: {
    borderColor: '#FF5A5F',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  uploadButton: {
    marginVertical: 12,
    backgroundColor: '#FF5A5F',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  imageContainer: {
    position: 'relative',
    margin: 4,
  },
  portfolioImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  deleteImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 2,
  },
  emptyPortfolio: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyPortfolioText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  emptyPortfolioSubText: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  customerFacingSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionHeaderText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fafafa',
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  nextButton: {
    backgroundColor: '#FF5A5F',
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
