import useAuth from '@/hooks/useauth';
import { supabase } from '@/lib/supabase';
import { AntDesign, Feather, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert, Dimensions, FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme } from 'victory-native';

import { ProgressBar } from 'react-native-paper';

const { width: screenWidth } = Dimensions.get('window');

export default function VendorDashboard ()  {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');
  const [profile, setProfile] = useState<any>(null);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leadsFilter, setLeadsFilter] = useState<'all' | 'pending' | 'booked' | 'rejected'>('all');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Vendor details state
  const [vendorDetails, setVendorDetails] = useState<any>(null);
  const [aboutText, setAboutText] = useState('');
  const [offers, setOffers] = useState<string[]>(['']);
  const [policies, setPolicies] = useState<string[]>(['']);
  const [priceInfo, setPriceInfo] = useState<string>('');
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reviewInvitations, setReviewInvitations] = useState<any[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  // Add state variables for analytics
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [comparisonData, setComparisonData] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchVendorData();
    }
  }, [user, activeTab]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchVendorData();
      }
    }, [user])
  );

  const onRefresh = async () => {

    setRefreshing(true);
    await fetchVendorData();
    setRefreshing(false);
  };

  const fetchReviewInvitations = async () => {
    try {
      if (!profile) return;
      
      const { data: invitations } = await supabase
        .from('review_invitations')
        .select('*')
        .eq('business_profile_id', profile.id)
        .order('created_at', { ascending: false });
      
      setReviewInvitations(invitations || []);
    } catch (error) {
      console.error('Error fetching review invitations:', error);
    }
  };

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      
      // Fetch verification data
      const { data: verificationData } = await supabase
        .from('vendor_verification_documents')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setVerificationData(verificationData);

      // Fetch profile
      const { data: profileData } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setProfile(profileData);

      if (profileData) {
        // Fetch vendor details
        const { data: vendorDetailsData } = await supabase
          .from('vendor_details')
          .select('*')
          .eq('business_profile_id', profileData.id)
          .single();

        setVendorDetails(vendorDetailsData);
        
        if (vendorDetailsData) {
          setAboutText(vendorDetailsData.about_text || '');
          setOffers(vendorDetailsData.offers || ['']);
          setPolicies(vendorDetailsData.policies || ['']);
          setPriceInfo(vendorDetailsData.price_info || '');
        }

        // Fetch portfolio images from business profile
        if (profileData.portfolio_images) {
          setPortfolioImages(profileData.portfolio_images);
        }

        // Fetch leads
        const { data: leadsData } = await supabase
          .from('vendor_leads')
          .select('*')
          .eq('vendor_id', profileData.id)
          .order('created_at', { ascending: false });
        setLeads(leadsData || []);

        // Fetch reviews
        const { data: reviewsData } = await supabase
          .from('vendor_reviews')
          .select('*')
          .eq('business_profile_id', profileData.id)
          .order('created_at', { ascending: false });
        setReviews(reviewsData || []);

        // Fetch review invitations
        fetchReviewInvitations();

        // Calculate stats
        const leadAnalytics = calculateLeadAnalytics(leadsData || []);
        const totalRating = reviewsData?.reduce((acc, curr) => acc + curr.rating, 0) || 0;
        const avgRating = reviewsData?.length ? (totalRating / reviewsData.length) : 0;
        const analytics = calculateAnalytics(leadsData || [], selectedPeriod);
        setAnalyticsData(analytics);
        
        setStats({
          ...leadAnalytics,
          totalLeads: leadsData?.length || 0,
          bookedLeads: leadsData?.filter(lead => lead.status === 'booked').length || 0,
          pendingLeads: leadsData?.filter(lead => lead.status === 'pending').length || 0,
          conversionRate: leadsData?.length 
            ? Math.round((leadsData.filter(lead => lead.status === 'booked').length / leadsData.length) * 100)
            : 0,
          avgRating: avgRating,
          totalReviews: reviewsData?.length || 0
        });
      }
    } catch (error) {
      console.error('Error fetching vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (leadsData: any[], period: 'week' | 'month' | 'quarter') => {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    const periodLeads = leadsData.filter(lead => 
      new Date(lead.created_at) >= startDate
    );

    // Lead types breakdown
    const leadTypes = {
      profile_views: periodLeads.filter(lead => lead.lead_type === 'profile_view').length,
      calls: periodLeads.filter(lead => lead.lead_type === 'call').length,
      whatsapp: periodLeads.filter(lead => lead.lead_type === 'whatsapp').length,
      emails: periodLeads.filter(lead => lead.lead_type === 'email').length,
      package_inquiries: periodLeads.filter(lead => lead.lead_type === 'package_inquiry').length
    };

    // Daily/weekly trends
    const trends = calculateTrends(periodLeads, period);

    // Conversion rates
    const totalLeads = periodLeads.length;
    const convertedLeads = periodLeads.filter(lead => lead.status === 'booked').length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    return {
      totalLeads,
      convertedLeads,
      conversionRate: Math.round(conversionRate),
      leadTypes,
      trends,
      periodLeads
    };
  };

  const calculateTrends = (leads: any[], period: 'week' | 'month' | 'quarter') => {
    const now = new Date();
    const dataPoints = period === 'week' ? 7 : period === 'month' ? 30 : 12;
    const trends = Array(dataPoints).fill(0);
    const labels = Array(dataPoints).fill('');

    leads.forEach(lead => {
      const leadDate = new Date(lead.created_at);
      const diffTime = Math.abs(now.getTime() - leadDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < dataPoints) {
        trends[dataPoints - 1 - diffDays]++;
      }
    });

    // Generate labels
    for (let i = 0; i < dataPoints; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (dataPoints - 1 - i));
      labels[i] = period === 'week' 
        ? date.toLocaleDateString('en-US', { weekday: 'short' })
        : `${date.getDate()}/${date.getMonth() + 1}`;
    }

    return { data: trends, labels };
  };

  const handleAddOffer = () => {
    setOffers([...offers, '']);
  };

  const handleRemoveOffer = (index: number) => {
    if (offers.length > 1) {
      const newOffers = [...offers];
      newOffers.splice(index, 1);
      setOffers(newOffers);
    }
  };

  const handleUpdateOffer = (index: number, value: string) => {
    const newOffers = [...offers];
    newOffers[index] = value;
    setOffers(newOffers);
  };

  const handleAddPolicy = () => {
    setPolicies([...policies, '']);
  };

  const handleRemovePolicy = (index: number) => {
    if (policies.length > 1) {
      const newPolicies = [...policies];
      newPolicies.splice(index, 1);
      setPolicies(newPolicies);
    }
  };

  const handleUpdatePolicy = (index: number, value: string) => {
    const newPolicies = [...policies];
    newPolicies[index] = value;
    setPolicies(newPolicies);
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      setUpdatingStatus(true);
      
      const { error } = await supabase
        .from('vendor_leads')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;

      // Refresh leads data
      fetchVendorData();
      setShowLeadModal(false);
      Alert.alert('Success', 'Lead status updated successfully!');

    } catch (error) {
      console.error('Error updating lead status:', error);
      Alert.alert('Error', 'Failed to update lead status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Function to calculate lead analytics
  const calculateLeadAnalytics = (leadsData: any[]) => {
    const now = new Date();
    const last30Days = new Date(now.setDate(now.getDate() - 30));
    
    const recentLeads = leadsData.filter(lead => 
      new Date(lead.created_at) >= last30Days
    );

    // Daily leads for chart
    const dailyLeads = Array(7).fill(0);
    const dayLabels = Array(7).fill('').map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    });

    recentLeads.forEach(lead => {
      const leadDate = new Date(lead.created_at);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - leadDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 6) {
        dailyLeads[6 - diffDays]++;
      }
    });

    // Status counts
    const statusCounts = {
      pending: leadsData.filter(lead => lead.status === 'pending').length,
      contacted: leadsData.filter(lead => lead.status === 'contacted').length,
      quoted: leadsData.filter(lead => lead.status === 'quoted').length,
      booked: leadsData.filter(lead => lead.status === 'booked').length,
      rejected: leadsData.filter(lead => lead.status === 'rejected').length
    };

    // Conversion rate
    const totalConverted = statusCounts.booked;
    const conversionRate = leadsData.length > 0 
      ? Math.round((totalConverted / leadsData.length) * 100) 
      : 0;

    // Lead sources (if you have this data)
    const leadSources = {
      profile: leadsData.filter(lead => lead.lead_type === 'profile_view').length,
      call: leadsData.filter(lead => lead.lead_type === 'call').length,
      whatsapp: leadsData.filter(lead => lead.lead_type === 'whatsapp').length,
      email: leadsData.filter(lead => lead.lead_type === 'email').length,
      package: leadsData.filter(lead => lead.lead_type === 'package_inquiry').length
    };

    return {
      dailyLeads,
      dayLabels,
      statusCounts,
      conversionRate,
      leadSources,
      totalLeads: leadsData.length,
      recentLeads: recentLeads.length
    };
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera roll permissions to upload images');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploading(true);
        const newImageUrls = [];
        
        // Upload each selected image
        for (const asset of result.assets) {
          const imageUrl = await uploadImage(asset.uri);
          if (imageUrl) {
            newImageUrls.push(imageUrl);
          }
        }
        
        if (newImageUrls.length > 0) {
          const updatedImages = [...portfolioImages, ...newImageUrls];
          setPortfolioImages(updatedImages);
          
          // Save to database
          await savePortfolioImages(updatedImages);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      // Check if user is available
      if (!user || !user.id) {
        Alert.alert('Error', 'User not found. Please login again.');
        return null;
      }

      // For React Native, we need to use a different approach
      // Create a form data object for upload
      const formData = new FormData();
      
      // Get the file extension from the URI
      const fileExtension = uri.split('.').pop();
      const filename = `${user.id}/${Date.now()}.${fileExtension || 'jpg'}`;
      
      // For React Native, we need to convert the image to a format that can be uploaded
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Append the file to form data
      formData.append('file', blob, filename);

      // Upload to Supabase Storage using the REST API
      const { data, error } = await supabase.storage
        .from('portfolio-images')
        .upload(filename, formData, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        
        if (error.message?.includes('bucket')) {
          Alert.alert(
            'Configuration Error', 
            'Portfolio storage is not properly configured. Please contact support.'
          );
        } else {
          Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
        }
        
        return null;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('portfolio-images')
        .getPublicUrl(filename);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
      return null;
    }
  };

  const savePortfolioImages = async (images: string[]) => {
    try {
      if (!profile) {
        Alert.alert('Error', 'No profile found');
        return;
      }

      // Update business_profiles table with new images array
      const { error } = await supabase
        .from('business_profiles')
        .update({ 
          portfolio_images: images,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      Alert.alert('Success', 'Portfolio images updated successfully!');
    } catch (error) {
      console.error('Error saving portfolio images:', error);
      Alert.alert('Error', 'Failed to save portfolio images');
    }
  };

  const removeImage = async (index: number) => {
    try {
      const newImages = [...portfolioImages];
      newImages.splice(index, 1);
      setPortfolioImages(newImages);
      
      // Save updated array to database
      await savePortfolioImages(newImages);
    } catch (error) {
      console.error('Error removing image:', error);
      Alert.alert('Error', 'Failed to remove image');
      fetchVendorData(); // Refresh to get original images
    }
  };

  const generateReviewLink = async () => {
    try {
      setSendingInvite(true);
      
      // Generate a token (replace with your logic)
      const token = Math.random().toString(36).substr(2);
      
      // Save the invitation to the database
      const { error } = await supabase
        .from('review_invitations')
        .insert([{
          business_profile_id: profile.id,
          customer_email: customerEmail || null,
          customer_phone: customerPhone || null,
          token: token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        }]);

      if (error) throw error;

      const reviewUrl = `https://yourapp.com/review?token=${token}`;
      
      // Here you would typically send this via email/SMS
      // For now, we'll show it to the user
      Alert.alert(
        'Review Link Generated',
        `Share this link with your customer: ${reviewUrl}`,
        [
          {
            text: 'Copy Link',
            onPress: () => {
              // Copy to clipboard functionality would go here
              console.log('Copy to clipboard:', reviewUrl);
            }
          },
          { text: 'OK' }
        ]
      );

      // Reset form
      setCustomerEmail('');
      setCustomerPhone('');
      setShowInviteForm(false);
      
      // Refresh invitations
      fetchReviewInvitations();

    } catch (error) {
      console.error('Error generating review link:', error);
      Alert.alert('Error', 'Failed to generate review link');
    } finally {
      setSendingInvite(false);
    }
  };

  const copyReviewLink = (token: string) => {
    const reviewUrl = `https://yourapp.com/review?token=${token}`;
    // Implement clipboard copy functionality
    console.log('Copy to clipboard:', reviewUrl);
    Alert.alert('Link Copied', 'Review link copied to clipboard!');
  }; 

  const saveVendorDetails = async () => {
    try {
      setSaving(true);
      
      if (!profile) {
        Alert.alert('Error', 'No profile found');
        return;
      }

      const vendorDetailsData = {
        business_profile_id: profile.id,
        about_text: aboutText,
        offers: offers.filter(offer => offer.trim() !== ''),
        policies: policies.filter(policy => policy.trim() !== ''),
        price_info: priceInfo,
        updated_at: new Date().toISOString()
      };

      // Update business profile with portfolio images
      const { error: profileError } = await supabase
        .from('business_profiles')
        .update({ portfolio_images: portfolioImages })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // Update or insert vendor details
      if (vendorDetails) {
        const { error } = await supabase
          .from('vendor_details')
          .update(vendorDetailsData)
          .eq('id', vendorDetails.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendor_details')
          .insert([vendorDetailsData]);

        if (error) throw error;
      }

      Alert.alert('Success', 'Your vendor details have been saved successfully!');
      setIsEditing(false);
      fetchVendorData(); // Refresh data
    } catch (error) {
      console.error('Error saving vendor details:', error);
      Alert.alert('Error', 'Failed to save vendor details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const MembershipCard = ({ profile, verificationData, router }: any) => {
    const isApproved = profile?.is_approved && verificationData?.approved;
    const isPremium = profile?.is_premium_member;
    
    const handleRequestMembership = () => {
      if (isApproved) {
        router.push('/Dashboard/membership');
      } else {
        alert('Please verify and get your profile approved first.');
      }
    };

    return (
      <TouchableOpacity 
        style={styles.membershipCard}
        onPress={() => router.push('/Dashboard/membership')}
      >
        <View style={styles.membershipHeader}>
          <Text style={styles.membershipTitle}>Wedemption Membership</Text>
          <View style={[
            styles.membershipBadge,
            isPremium ? styles.premiumBadge : styles.standardBadge
          ]}>
            <Text style={styles.membershipBadgeText}>
              {isPremium ? 'Premium' : 'Standard'}
            </Text>
          </View>
        </View>
        
        <View style={styles.membershipPrice}>
          <Text style={styles.membershipPriceText}>₹10,999</Text>
          <Text style={styles.membershipDuration}>/year</Text>
        </View>
        
        <View style={styles.membershipFeatures}>
          <View style={styles.featureItem}>
            <AntDesign name="checkcircle" size={16} color="#10B981" />
            <Text style={styles.featureText}>Estimated Leads Yearly 40-70 </Text>
          </View>
          <View style={styles.featureItem}>
            <AntDesign name="checkcircle" size={16} color="#10B981" />
            <Text style={styles.featureText}>Get Visibility on the First Page</Text>
          </View>
          <View style={styles.featureItem}>
            <AntDesign name="checkcircle" size={16} color="#10B981" />
            <Text style={styles.featureText}>Customize Profile Management Support</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.membershipButton,
            isPremium ? styles.membershipButtonPremium : 
            isApproved ? styles.membershipButtonActive : styles.membershipButtonDisabled
          ]}
          onPress={handleRequestMembership}
        >
          <Text style={styles.membershipButtonText}>
            {isPremium ? 'Premium Member' : 
             isApproved ? 'Upgrade to Premium' : 'Verify Profile First'}
          </Text>
        </TouchableOpacity>
        
        {isPremium && (
          <Text style={styles.membershipExpiry}>
            Membership valid until: {new Date(profile.membership_end_date).toLocaleDateString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderVerificationStatus = () => {
    if (!verificationData) {
      return (
        <View style={styles.verificationCard}>
          <MaterialIcons name="assignment" size={24} color="#3B82F6" />
          <View style={styles.verificationTextContainer}>
            <Text style={styles.verificationTitle}>Complete Business Verification</Text>
            <Text style={styles.verificationSubtitle}>
              Submit your business documents to become a verified vendor
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/Dashboard/document')} style={styles.verificationButton}>
            <Text style={styles.verificationButtonText}>Start</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (verificationData.approved === true) {
      return (
        <View style={styles.verificationSuccessCard}>
          <MaterialIcons name="check-circle" size={24} color="#10B981" />
          <View style={styles.verificationTextContainer}>
            <Text style={styles.verificationTitle}>Verification Approved</Text>
            <Text style={styles.verificationSubtitle}>
              You are now a verified vendor
            </Text>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.verificationStatusCard}>
        <MaterialIcons name="schedule" size={24} color="#F59E0B" />
        <View style={styles.verificationTextContainer}>
          <Text style={styles.verificationTitle}>Verification in Progress</Text>
          <Text style={styles.verificationSubtitle}>
            We are verifying your business details
          </Text>
        </View>
      </View>
    );
  };

  const renderPortfolioSection = (showAddButton: boolean) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Portfolio Images</Text>
      <Text style={styles.sectionSubtitle}>
        Upload more pictures of your work to get more leads
      </Text>
      
      {portfolioImages.length > 0 ? (
        <FlatList
          data={portfolioImages}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item, index }) => (
            <View style={styles.imageContainer}>
              <Image source={{ uri: item }} style={styles.portfolioImage} />
              {showAddButton && (
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <AntDesign name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          )}
          contentContainerStyle={styles.imagesList}
        />
      ) : (
        <Text style={styles.noImagesText}>No portfolio images yet</Text>
      )}
      
      <TouchableOpacity 
        style={styles.addImageButton}
        onPress={pickImage}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator size="small" color="#3B82F6" />
        ) : (
          <>
            <AntDesign name="plus" size={20} color="#3B82F6" />
            <Text style={styles.addImageText}>Add Album</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderHomeTab = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Header */}
      <View style={styles.welcomeHeader}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.businessName}>{profile?.business_name || 'Vendor'}</Text>
        
        {profile?.is_partner && (
          <View style={styles.partnerBadge}>
            <Feather name="award" size={14} color="#FFFFFF" />
            <Text style={styles.partnerText}>Wedemption Partner</Text>
          </View>
        )}
      </View>

      {/* Alert Banner */}
      {!profile?.is_approved && (
        <View style={styles.alertBox}>
          <MaterialIcons name="warning" size={20} color="#D97706" />
          <Text style={styles.alertText}>
            {profile?.completion_percentage >= 80 
              ? "Your profile is pending approval" 
              : "Complete your profile to get approved"}
          </Text>
          <TouchableOpacity 
            onPress={() => router.push('/Dashboard/BuisnessProfille')}
            style={styles.alertButton}
          >
            <Text style={styles.alertButtonText}>
              {profile?.completion_percentage >= 80 ? 'View Status' : 'Complete Now'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Profile Completion */}
      <View style={styles.profileCompletion}>
        <View style={styles.profileHeader}>
          <Text style={styles.sectionTitle}>Profile Completion</Text>
          <Text style={styles.percentageText}>{profile?.completion_percentage || 0}%</Text>
        </View>
        <ProgressBar 
          progress={profile?.completion_percentage ? profile.completion_percentage / 100 : 0} 
          color={profile?.completion_percentage >= 80 ? '#10B981' : '#3B82F6'} 
          style={styles.progressBar}
        />
        {profile?.completion_percentage < 80 && (
          <Text style={styles.completionHint}>Complete your profile to get more leads</Text>
        )}
      </View>
      
      {/* Verification Status */}
      {renderVerificationStatus()}

      <MembershipCard profile={profile} verificationData={verificationData} router={router} />

      {/* Portfolio Section */}
      {renderPortfolioSection(false)}

      {/* Stats Overview */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#E0F2FE' }]}>
            <Feather name="inbox" size={20} color="#0EA5E9" />
          </View>
          <Text style={styles.statNumber}>{stats.totalLeads || 0}</Text>
          <Text style={styles.statLabel}>Total Leads</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#F0FDF4' }]}>
            <Feather name="check-circle" size={20} color="#22C55E" />
          </View>
          <Text style={styles.statNumber}>{stats.bookedLeads || 0}</Text>
          <Text style={styles.statLabel}>Booked</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FFEDD5' }]}>
            <Feather name="trending-up" size={20} color="#F97316" />
          </View>
          <Text style={styles.statNumber}>{stats.conversionRate || 0}%</Text>
          <Text style={styles.statLabel}>Conversion</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
            <FontAwesome name="star" size={20} color="#F59E0B" />
          </View>
          <Text style={styles.statNumber}>{stats.avgRating?.toFixed(1) || '0.0'}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => router.push('./BuisnessProfille')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
            <MaterialIcons name="edit" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.actionText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => setActiveTab('leads')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#F0F9FF' }]}>
            <Feather name="inbox" size={24} color="#0EA5E9" />
          </View>
          <Text style={styles.actionText}>View Leads</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => setActiveTab('reviews')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FFFBEB' }]}>
            <FontAwesome name="star" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.actionText}>Reviews</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => setActiveTab('analytics')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
            <MaterialIcons name="insights" size={24} color="#22C55E" />
          </View>
          <Text style={styles.actionText}>Analytics</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles.recentActivity}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Leads</Text>
          <TouchableOpacity onPress={() => setActiveTab('leads')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {leads.slice(0, 3).map(lead => (
          <View key={lead.id} style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Feather 
                name="mail" 
                size={16} 
                color={
                  lead.status === 'booked' ? '#22C55E' : 
                  lead.status === 'rejected' ? '#EF4444' : '#3B82F6'
                } 
              />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{lead.customer_name}</Text>
              <Text style={styles.activitySubtitle}>
                {lead.event_date ? new Date(lead.event_date).toLocaleDateString() : 'No date specified'}
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: 
                lead.status === 'booked' ? '#D1FAE5' : 
                lead.status === 'rejected' ? '#FEE2E2' : '#E0E7FF' 
              }
            ]}>
              <Text style={[
                styles.statusText,
                { 
                  color: 
                    lead.status === 'booked' ? '#065F46' : 
                    lead.status === 'rejected' ? '#B91C1C' : '#1E40AF' 
                }
              ]}>
                {lead.status ? lead.status.charAt(0).toUpperCase() + lead.status.slice(1) : 'Unknown'}
              </Text>
            </View>
          </View>
        ))}
        {leads.length === 0 && (
          <View style={styles.emptyActivity}>
            <Feather name="inbox" size={32} color="#E5E7EB" />
            <Text style={styles.emptyActivityText}>No recent leads</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderVendorDetailsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Vendor Details</Text>
        <Text style={styles.tabSubtitle}>
          Manage your portfolio and business information
        </Text>
      </View>

      {!isEditing ? (
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setIsEditing(true)}
        >
          <Feather name="edit" size={18} color="#FFFFFF" />
          <Text style={styles.editButtonText}>Edit Details</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.editActions}>
          <TouchableOpacity 
            style={[styles.editActionButton, styles.cancelButton]}
            onPress={() => {
              setIsEditing(false);
              fetchVendorData(); // Reset changes
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.editActionButton, styles.saveButton]}
            onPress={saveVendorDetails}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Portfolio Section in Edit Mode */}
      {renderPortfolioSection(isEditing)}

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        {isEditing ? (
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={aboutText}
            onChangeText={setAboutText}
            placeholder="Tell customers about your business..."
            multiline
            numberOfLines={4}
          />
        ) : (
          <View style={styles.readOnlyField}>
            <Text style={aboutText ? styles.readOnlyText : styles.placeholderText}>
              {aboutText || 'No description added yet'}
            </Text>
          </View>
        )}
      </View>

      {/* Offers Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Offers</Text>
        {isEditing ? (
          <>
            {offers.map((offer, index) => (
              <View key={index} style={styles.editableListItem}>
                <TextInput
                  style={[styles.textInput, styles.listInput]}
                  value={offer}
                  onChangeText={(value) => handleUpdateOffer(index, value)}
                  placeholder={`Offer #${index + 1}`}
                />
                {offers.length > 1 && (
                  <TouchableOpacity 
                    style={styles.removeItemButton}
                    onPress={() => handleRemoveOffer(index)}
                  >
                    <AntDesign name="close" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity 
              style={styles.addItemButton}
              onPress={handleAddOffer}
            >
              <AntDesign name="plus" size={16} color="#3B82F6" />
              <Text style={styles.addItemText}>Add Offer</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.readOnlyList}>
            {offers.filter(offer => offer.trim() !== '').length > 0 ? (
              offers.filter(offer => offer.trim() !== '').map((offer, index) => (
                <View key={index} style={styles.readOnlyListItem}>
                  <AntDesign name="check" size={16} color="#10B981" />
                  <Text style={styles.readOnlyListText}>{offer}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.placeholderText}>No offers added yet</Text>
            )}
          </View>
        )}
      </View>

      {/* Policies Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Policies</Text>
        {isEditing ? (
          <>
            {policies.map((policy, index) => (
              <View key={index} style={styles.editableListItem}>
                <TextInput
                  style={[styles.textInput, styles.listInput]}
                  value={policy}
                  onChangeText={(value) => handleUpdatePolicy(index, value)}
                  placeholder={`Policy #${index + 1}`}
                />
                {policies.length > 1 && (
                  <TouchableOpacity 
                    style={styles.removeItemButton}
                    onPress={() => handleRemovePolicy(index)}
                  >
                    <AntDesign name="close" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity 
              style={styles.addItemButton}
              onPress={handleAddPolicy}
            >
              <AntDesign name="plus" size={16} color="#3B82F6" />
              <Text style={styles.addItemText}>Add Policy</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.readOnlyList}>
            {policies.filter(policy => policy.trim() !== '').length > 0 ? (
              policies.filter(policy => policy.trim() !== '').map((policy, index) => (
                <View key={index} style={styles.readOnlyListItem}>
                  <AntDesign name="check" size={16} color="#10B981" />
                  <Text style={styles.readOnlyListText}>{policy}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.placeholderText}>No policies added yet</Text>
            )}
          </View>
        )}
      </View>

      {/* Price Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Price Information</Text>
        {isEditing ? (
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={priceInfo}
            onChangeText={setPriceInfo}
            placeholder="Add information about your pricing..."
            multiline
            numberOfLines={3}
          />
        ) : (
          <View style={styles.readOnlyField}>
            <Text style={priceInfo ? styles.readOnlyText : styles.placeholderText}>
              {priceInfo || 'No price information added yet'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderLeadsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Leads Analytics</Text>
        <Text style={styles.tabSubtitle}>
          Track and manage your customer leads
        </Text>
      </View>

      {/* Leads Overview Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leads Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E0F2FE' }]}>
              <Feather name="inbox" size={20} color="#0EA5E9" />
            </View>
            <Text style={styles.statNumber}>{stats.totalLeads || 0}</Text>
            <Text style={styles.statLabel}>Total Leads</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F0FDF4' }]}>
              <Feather name="check-circle" size={20} color="#22C55E" />
            </View>
            <Text style={styles.statNumber}>{stats.statusCounts?.booked || 0}</Text>
            <Text style={styles.statLabel}>Booked</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FFEDD5' }]}>
              <Feather name="trending-up" size={20} color="#F97316" />
            </View>
            <Text style={styles.statNumber}>{stats.conversionRate || 0}%</Text>
            <Text style={styles.statLabel}>Conversion</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
              <Feather name="calendar" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.statNumber}>{stats.recentLeads || 0}</Text>
            <Text style={styles.statLabel}>Last 30 Days</Text>
          </View>
        </View>
      </View>

      {/* Lead Status Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lead Status</Text>
        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.statusCount}>{stats.statusCounts?.pending || 0}</Text>
            <Text style={styles.statusLabel}>Pending</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.statusCount}>{stats.statusCounts?.contacted || 0}</Text>
            <Text style={styles.statusLabel}>Contacted</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.statusCount}>{stats.statusCounts?.quoted || 0}</Text>
            <Text style={styles.statusLabel}>Quoted</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.statusCount}>{stats.statusCounts?.booked || 0}</Text>
            <Text style={styles.statusLabel}>Booked</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.statusCount}>{stats.statusCounts?.rejected || 0}</Text>
            <Text style={styles.statusLabel}>Rejected</Text>
          </View>
        </View>
      </View>

      {/* Lead Sources */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lead Sources</Text>
        <View style={styles.sourcesList}>
          <View style={styles.sourceItem}>
            <View style={styles.sourceInfo}>
              <Feather name="eye" size={16} color="#3B82F6" />
              <Text style={styles.sourceText}>Profile Views</Text>
            </View>
            <Text style={styles.sourceCount}>{stats.leadSources?.profile || 0}</Text>
          </View>
          <View style={styles.sourceItem}>
            <View style={styles.sourceInfo}>
              <Feather name="phone" size={16} color="#10B981" />
              <Text style={styles.sourceText}>Phone Calls</Text>
            </View>
            <Text style={styles.sourceCount}>{stats.leadSources?.call || 0}</Text>
          </View>
          <View style={styles.sourceItem}>
            <View style={styles.sourceInfo}>
              <Feather name="message-circle" size={16} color="#25D366" />
              <Text style={styles.sourceText}>WhatsApp</Text>
            </View>
            <Text style={styles.sourceCount}>{stats.leadSources?.whatsapp || 0}</Text>
          </View>
          <View style={styles.sourceItem}>
            <View style={styles.sourceInfo}>
              <Feather name="mail" size={16} color="#8B5CF6" />
              <Text style={styles.sourceText}>Emails</Text>
            </View>
            <Text style={styles.sourceCount}>{stats.leadSources?.email || 0}</Text>
          </View>
          <View style={styles.sourceItem}>
            <View style={styles.sourceInfo}>
              <Feather name="package" size={16} color="#F59E0B" />
              <Text style={styles.sourceText}>Package Inquiries</Text>
            </View>
            <Text style={styles.sourceCount}>{stats.leadSources?.package || 0}</Text>
          </View>
        </View>
      </View>

      {/* Leads Filter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Leads</Text>
        <View style={styles.filterContainer}>
          {(['all', 'pending', 'booked', 'rejected'] as const).map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                leadsFilter === filter && styles.filterButtonActive
              ]}
              onPress={() => setLeadsFilter(filter)}
            >
              <Text style={[
                styles.filterText,
                leadsFilter === filter && styles.filterTextActive
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Leads List */}
        <View style={styles.leadsList}>
          {leads
            .filter(lead => leadsFilter === 'all' || lead.status === leadsFilter)
            .map(lead => (
              <TouchableOpacity
                key={lead.id}
                style={styles.leadCard}
                onPress={() => {
                  setSelectedLead(lead);
                  setShowLeadModal(true);
                }}
              >
                <View style={styles.leadHeader}>
                  <Text style={styles.leadName}>
                    {lead.customer_name || 'Unknown Customer'}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { 
                      backgroundColor: 
                        lead.status === 'booked' ? '#D1FAE5' : 
                        lead.status === 'rejected' ? '#FEE2E2' : 
                        lead.status === 'contacted' ? '#E0E7FF' :
                        lead.status === 'quoted' ? '#FEF3C7' :
                        '#F3F4F6'
                    }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { 
                        color: 
                          lead.status === 'booked' ? '#065F46' : 
                          lead.status === 'rejected' ? '#B91C1C' : 
                          lead.status === 'contacted' ? '#1E40AF' :
                          lead.status === 'quoted' ? '#92400E' :
                          '#374151'
                      }
                    ]}>
                      {lead.status ? lead.status.charAt(0).toUpperCase() + lead.status.slice(1) : 'Unknown'}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.leadDate}>
                  {new Date(lead.created_at).toLocaleDateString()}
                </Text>
                
                <Text style={styles.leadType}>
                  Via: {lead.lead_type.replace('_', ' ')}
                </Text>

                {lead.event_date && (
                  <Text style={styles.leadEvent}>
                    Event: {new Date(lead.event_date).toLocaleDateString()}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
        </View>

        {leads.filter(lead => leadsFilter === 'all' || lead.status === leadsFilter).length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={40} color="#E5E7EB" />
            <Text style={styles.emptyStateText}>No leads found</Text>
            <Text style={styles.emptyStateSubtext}>
              {leadsFilter === 'all' 
                ? 'You haven\'t received any leads yet' 
                : `No ${leadsFilter} leads`
              }
            </Text>
          </View>
        )}
      </View>

      {/* Lead Detail Modal */}
      {showLeadModal && selectedLead && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lead Details</Text>
              <TouchableOpacity 
                onPress={() => setShowLeadModal(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Customer</Text>
                <Text style={styles.detailValue}>
                  {selectedLead.customer_name || 'Not provided'}
                </Text>
              </View>

              {selectedLead.customer_phone && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{selectedLead.customer_phone}</Text>
                </View>
              )}

              {selectedLead.customer_email && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{selectedLead.customer_email}</Text>
                </View>
              )}

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Received</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedLead.created_at).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Source</Text>
                <Text style={styles.detailValue}>
                  {selectedLead.lead_type.replace('_', ' ')}
                </Text>
              </View>

              {selectedLead.event_date && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Event Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedLead.event_date).toLocaleDateString()}
                  </Text>
                </View>
              )}

              {selectedLead.event_type && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Event Type</Text>
                  <Text style={styles.detailValue}>{selectedLead.event_type}</Text>
                </View>
              )}

              {selectedLead.budget && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Budget</Text>
                  <Text style={styles.detailValue}>{selectedLead.budget}</Text>
                </View>
              )}
              

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Current Status</Text>
                <View style={[
                  styles.statusBadge,
                  { 
                    backgroundColor: 
                      selectedLead.status === 'booked' ? '#D1FAE5' : 
                      selectedLead.status === 'rejected' ? '#FEE2E2' : 
                      selectedLead.status === 'contacted' ? '#E0E7FF' :
                      selectedLead.status === 'quoted' ? '#FEF3C7' :
                      '#F3F4F6'
                  }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { 
                      color: 
                        selectedLead.status === 'booked' ? '#065F46' : 
                        selectedLead.status === 'rejected' ? '#B91C1C' : 
                        selectedLead.status === 'contacted' ? '#1E40AF' :
                        selectedLead.status === 'quoted' ? '#92400E' :
                        '#374151'
                    }
                  ]}>
                    {selectedLead.status.charAt(0).toUpperCase() + selectedLead.status.slice(1)}
                  </Text>
                </View>
              </View>

              {/* Update Status Section */}
              <View style={styles.statusUpdateSection}>
                <Text style={styles.sectionTitle}>Update Status</Text>
                <View style={styles.statusButtons}>
                  {['pending', 'contacted', 'quoted', 'booked', 'rejected'].map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        selectedLead.status === status && styles.statusButtonActive
                      ]}
                      onPress={() => updateLeadStatus(selectedLead.id, status)}
                      disabled={updatingStatus}
                    >
                      <Text style={[
                        styles.statusButtonText,
                        selectedLead.status === status && styles.statusButtonTextActive
                      ]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderAnalyticsTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['week', 'month', 'quarter'] as const).map(period => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive
            ]}>
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Overview Cards */}
      <View style={styles.overviewGrid}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Total Leads</Text>
          <Text style={styles.overviewValue}>{analyticsData?.totalLeads || 0}</Text>
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Conversion Rate</Text>
          <Text style={styles.overviewValue}>{analyticsData?.conversionRate || 0}%</Text>
          <Text style={styles.overviewSubtext}>{analyticsData?.convertedLeads || 0} booked</Text>
        </View>
      </View>

      {/* Lead Trends Chart */}
      {analyticsData?.trends && (
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Lead Trends</Text>
          <VictoryChart
  theme={VictoryTheme.material}
  width={screenWidth - 40}
  height={220}
  padding={{ top: 20, bottom: 40, left: 40, right: 20 }}
>
  <VictoryAxis
    tickValues={analyticsData.trends.labels}
    style={{
      axis: { stroke: "#E5E7EB" },
      tickLabels: { fontSize: 10, fill: "#6B7280" }
    }}
  />
  <VictoryAxis
    dependentAxis
    style={{
      axis: { stroke: "#E5E7EB" },
      tickLabels: { fontSize: 10, fill: "#6B7280" }
    }}
  />
  <VictoryLine
    data={analyticsData.trends.labels.map((label: any, index: string | number) => ({
      x: label,
      y: analyticsData.trends.data[index]
    }))}
    style={{
      data: { 
        stroke: "#3B82F6",
        strokeWidth: 2
      }
    }}
    animate={{
      duration: 500,
      onLoad: { duration: 500 }
    }}
  />
</VictoryChart>
        </View>
      )}

      {/* Lead Type Breakdown */}
      {analyticsData?.leadTypes && (
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Lead Type Breakdown</Text>
          <View style={styles.leadTypeGrid}>
            <View style={styles.leadTypeCard}>
              <View style={[styles.leadTypeIcon, { backgroundColor: '#3B82F620' }]}>
                <Feather name="eye" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.leadTypeCount}>{analyticsData.leadTypes.profile_views}</Text>
              <Text style={styles.leadTypeLabel}>Profile Views</Text>
            </View>
            
            <View style={styles.leadTypeCard}>
              <View style={[styles.leadTypeIcon, { backgroundColor: '#10B98120' }]}>
                <Feather name="phone" size={20} color="#10B981" />
              </View>
              <Text style={styles.leadTypeCount}>{analyticsData.leadTypes.calls}</Text>
              <Text style={styles.leadTypeLabel}>Phone Calls</Text>
            </View>
            
            <View style={styles.leadTypeCard}>
              <View style={[styles.leadTypeIcon, { backgroundColor: '#25D36620' }]}>
                <Feather name="message-circle" size={20} color="#25D366" />
              </View>
              <Text style={styles.leadTypeCount}>{analyticsData.leadTypes.whatsapp}</Text>
              <Text style={styles.leadTypeLabel}>WhatsApp</Text>
            </View>
            
            <View style={styles.leadTypeCard}>
              <View style={[styles.leadTypeIcon, { backgroundColor: '#8B5CF620' }]}>
                <Feather name="mail" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.leadTypeCount}>{analyticsData.leadTypes.emails}</Text>
              <Text style={styles.leadTypeLabel}>Emails</Text>
            </View>
          </View>
        </View>
      )}

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Leads</Text>
        {analyticsData?.periodLeads?.slice(0, 5).map((lead: any) => (
          <View key={lead.id} style={styles.leadItem}>
            <View style={styles.leadInfo}>
              <Text style={styles.leadName}>{lead.customer_name || 'Unknown Customer'}</Text>
              <Text style={styles.leadDate}>
                {new Date(lead.created_at).toLocaleDateString()} • 
                {lead.lead_type.replace('_', ' ')}
              </Text>
            </View>
            <View style={[
              styles.leadStatus,
              { backgroundColor: 
                lead.status === 'booked' ? '#D1FAE5' : 
                lead.status === 'rejected' ? '#FEE2E2' : 
                '#E0E7FF'
              }
            ]}>
              <Text style={[
                styles.leadStatusText,
                { 
                  color: 
                    lead.status === 'booked' ? '#065F46' : 
                    lead.status === 'rejected' ? '#B91C1C' : 
                    '#1E40AF'
                }
              ]}>
                {lead.status}
              </Text>
              </View>
          </View>
        ))}
        {(!analyticsData?.periodLeads || analyticsData.periodLeads.length === 0) && (
          <Text style={styles.emptyText}>No leads in this period</Text>
        )}
      </View>
    </ScrollView>
  );

  const renderReviewsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Customer Reviews</Text>
        <Text style={styles.tabSubtitle}>
          Manage and request reviews from your customers
        </Text>
      </View>

      {/* Review Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Review Statistics</Text>
        <View style={styles.statsRow}>
          <View style={styles.reviewStat}>
            <Text style={styles.reviewStatNumber}>{stats.avgRating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.reviewStatLabel}>Average Rating</Text>
          </View>
          <View style={styles.reviewStat}>
            <Text style={styles.reviewStatNumber}>{stats.totalReviews || 0}</Text>
            <Text style={styles.reviewStatLabel}>Total Reviews</Text>
          </View>
          <View style={styles.reviewStat}>
            <Text style={styles.reviewStatNumber}>
              {stats.totalReviews ? Math.round((reviews.filter(r => r.rating >= 4).length / stats.totalReviews) * 100) : 0}%
            </Text>
            <Text style={styles.reviewStatLabel}>Positive Reviews</Text>
          </View>
        </View>
      </View>

      {/* Request Reviews Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Request Reviews</Text>
        <Text style={styles.sectionSubtitle}>
          Send review requests to your customers
        </Text>

        {!showInviteForm ? (
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => setShowInviteForm(true)}
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Request Review</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.inviteForm}>
            <TextInput
              style={styles.textInput}
              placeholder="Customer Email"
              value={customerEmail}
              onChangeText={setCustomerEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.orText}>OR</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Customer Phone"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
            />
            <View style={styles.formActions}>
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setShowInviteForm(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]}
                onPress={generateReviewLink}
                disabled={sendingInvite || (!customerEmail && !customerPhone)}
              >
                {sendingInvite ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Active Review Invitations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Review Requests</Text>
        {reviewInvitations.filter(inv => inv.status === 'pending').length > 0 ? (
          reviewInvitations.filter(inv => inv.status === 'pending').map(invitation => (
            <View key={invitation.id} style={styles.invitationCard}>
              <View style={styles.invitationInfo}>
                <Text style={styles.invitationCustomer}>
                  {invitation.customer_email || invitation.customer_phone || 'Customer'}
                </Text>
                <Text style={styles.invitationDate}>
                  Sent: {new Date(invitation.created_at).toLocaleDateString()}
                </Text>
                <Text style={styles.invitationExpiry}>
                  Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={() => copyReviewLink(invitation.token)}
              >
                <Feather name="copy" size={16} color="#3B82F6" />
                <Text style={styles.copyButtonText}>Copy Link</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.placeholderText}>No active review requests</Text>
        )}
      </View>

      {/* Customer Reviews List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Customer Reviews</Text>
          <Text style={styles.reviewCount}>{reviews.length} reviews</Text>
        </View>

        {reviews.length > 0 ? (
          reviews.map(review => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>{review.customer_name}</Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Feather 
                      key={star}
                      name="star" 
                      size={16} 
                      color={star <= review.rating ? '#F59E0B' : '#E5E7EB'} 
                    />
                  ))}
                </View>
              </View>
              <Text style={styles.reviewDate}>
                {new Date(review.created_at).toLocaleDateString()}
              </Text>
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Feather name="message-square" size={40} color="#E5E7EB" />
            <Text style={styles.emptyStateText}>No reviews yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Send review requests to your customers to get started
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderStatsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Business Analytics</Text>
        <Text style={styles.tabSubtitle}>
          Detailed insights about your business performance
        </Text>
      </View>

      {/* Performance Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalLeads || 0}</Text>
            <Text style={styles.statLabel}>Total Leads</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.conversionRate || 0}%</Text>
            <Text style={styles.statLabel}>Conversion Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.recentLeads || 0}</Text>
            <Text style={styles.statLabel}>Last 30 Days</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.avgRating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>
      </View>

      {/* Lead Trends Chart (Placeholder) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lead Trends</Text>
        <View style={styles.chartPlaceholder}>
          <Feather name="bar-chart" size={40} color="#E5E7EB" />
          <Text style={styles.placeholderText}>Lead trends chart will be displayed here</Text>
        </View>
      </View>

      {/* Revenue Projection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Projection</Text>
        <View style={styles.revenueCard}>
          <Text style={styles.revenueTitle}>Estimated Monthly Revenue</Text>
          <Text style={styles.revenueAmount}>₹{(stats.statusCounts?.booked || 0) * 25000}</Text>
          <Text style={styles.revenueSubtitle}>
            Based on {stats.statusCounts?.booked || 0} booked leads
          </Text>
        </View>
      </View>

      {/* Performance Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Tips</Text>
        <View style={styles.tipsList}>
          <View style={styles.tipItem}>
            <Feather name="target" size={20} color="#3B82F6" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Improve Response Time</Text>
              <Text style={styles.tipDescription}>
                Respond to leads within 1 hour to increase conversion by 40%
              </Text>
            </View>
          </View>
          <View style={styles.tipItem}>
            <Feather name="image" size={20} color="#10B981" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Add More Portfolio Images</Text>
              <Text style={styles.tipDescription}>
                Vendors with 10+ images get 3x more leads
              </Text>
            </View>
          </View>
          <View style={styles.tipItem}>
            <Feather name="star" size={20} color="#F59E0B" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Request Reviews</Text>
              <Text style={styles.tipDescription}>
                Higher ratings can increase your visibility by 60%
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Content */}
      {activeTab === 'home' && renderHomeTab()}
      {activeTab === 'profile' && renderVendorDetailsTab()}
      {activeTab === 'leads' && renderLeadsTab()}
      {activeTab === 'reviews' && renderReviewsTab()}
      {activeTab === 'analytics' && renderAnalyticsTab()}
      {activeTab === 'stats' && renderStatsTab()}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {[
          { key: 'home', icon: 'home', label: 'Home' },
          { key: 'analytics', icon: 'bar-chart', label: 'Analytics' },
          { key: 'leads', icon: 'inbox', label: 'Leads' },
          { key: 'reviews', icon: 'star', label: 'Reviews' },
          { key: 'stats', icon: 'bar-chart', label: 'Stats' },
        ].map((item) => (
          <TouchableOpacity 
            key={item.key}
            style={[styles.navButton, activeTab === item.key && styles.activeNavButton]}
            onPress={() => setActiveTab(item.key)}
          >
            <Feather 
              name={item.icon as any} 
              size={22} 
              color={activeTab === item.key ? '#3B82F6' : '#9CA3AF'} 
            />
            <Text style={[
              styles.navText,
              { color: activeTab === item.key ? '#3B82F6' : '#9CA3AF' }
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 40,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
  },
  tabContent: {
    flex: 1,
    padding: 16,
    paddingBottom: 80,
  },
  
  // Home Tab Styles
  welcomeHeader: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    color: '#6B7280',
  },
  businessName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 4,
  },
  partnerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  alertText: {
    flex: 1,
    color: '#92400E',
    fontWeight: '500',
  },
  alertButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  profileCompletion: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  completionHint: {
    fontSize: 12,
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  recentActivity: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyActivity: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyActivityText: {
    color: '#9CA3AF',
    fontSize: 14,
  },

  // Common Styles
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Vendor Details Tab Styles
  tabHeader: {
    marginBottom: 24,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  tabSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  editActionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  imagesList: {
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  portfolioImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  portfolioImageReadOnly: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  addImageText: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  noImagesText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  readOnlyField: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
  },
  readOnlyText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  editableListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  listInput: {
    flex: 1,
  },
  removeItemButton: {
    padding: 8,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  addItemText: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  readOnlyList: {
    gap: 12,
  },
  readOnlyListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  readOnlyListText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  reviewLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  reviewLink: {
    flex: 1,
    fontSize: 14,
    color: '#3B82F6',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  copyButtonText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
  },
  reviewHint: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },

  // Membership Card Styles
  membershipCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  membershipTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  membershipBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadge: {
    backgroundColor: '#FEF3C7',
  },
  standardBadge: {
    backgroundColor: '#EFF6FF',
  },
  membershipBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  membershipPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  membershipPriceText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3B82F6',
  },
  membershipDuration: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  membershipFeatures: {
    marginBottom: 16,
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
  },
  membershipButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  membershipButtonActive: {
    backgroundColor: '#3B82F6',
  },
  membershipButtonPremium: {
    backgroundColor: '#10B981',
  },
  membershipButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  membershipButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  membershipExpiry: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },

  // Verification Styles
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  verificationStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  verificationSuccessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  verificationTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  // Add these styles to your existing styles
periodSelector: {
  flexDirection: 'row',
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 4,
  marginBottom: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
},
periodButton: {
  flex: 1,
  padding: 8,
  borderRadius: 8,
  alignItems: 'center',
},
periodButtonActive: {
  backgroundColor: '#3B82F6',
},
periodButtonText: {
  fontSize: 12,
  fontWeight: '500',
  color: '#6B7280',
},
periodButtonTextActive: {
  color: '#FFFFFF',
},
overviewGrid: {
  flexDirection: 'row',
  gap: 12,
  marginBottom: 20,
},
overviewCard: {
  flex: 1,
  backgroundColor: '#FFFFFF',
  padding: 16,
  borderRadius: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
},
overviewLabel: {
  fontSize: 12,
  color: '#6B7280',
  marginBottom: 4,
},
overviewValue: {
  fontSize: 24,
  fontWeight: '700',
  color: '#111827',
  marginBottom: 4,
},
overviewSubtext: {
  fontSize: 12,
  color: '#6B7280',
},
chartContainer: {
  backgroundColor: '#FFFFFF',
  padding: 16,
  borderRadius: 12,
  marginBottom: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
},
chart: {
  marginVertical: 8,
  borderRadius: 16,
},
leadTypeGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 12,
},
leadTypeCard: {
  width: '48%',
  backgroundColor: '#F9FAFB',
  padding: 16,
  borderRadius: 8,
  alignItems: 'center',
},
leadTypeIcon: {
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 8,
},
leadTypeCount: {
  fontSize: 20,
  fontWeight: '700',
  color: '#111827',
  marginBottom: 4,
},
leadTypeLabel: {
  fontSize: 12,
  color: '#6B7280',
  textAlign: 'center',
},
leadItem: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 12,
  backgroundColor: '#F9FAFB',
  borderRadius: 8,
  marginBottom: 8,
},
leadInfo: {
  flex: 1,
},
leadName: {
  fontSize: 14,
  fontWeight: '600',
  color: '#111827',
  marginBottom: 2,
},
leadDate: {
  fontSize: 12,
  color: '#6B7280',
},
leadStatus: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
},
leadStatusText: {
  fontSize: 10,
  fontWeight: '600',
},
emptyText: {
  textAlign: 'center',
  color: '#9CA3AF',
  fontStyle: 'italic',
  padding: 20,
}, 
  verificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  verificationSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  verificationButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  verificationButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navButton: {
    alignItems: 'center',
    padding: 8,
    minWidth: 60,
  },
  activeNavButton: {
    borderTopWidth: 2,
    borderTopColor: '#3B82F6',
  },
  navText: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },

  // NEW STYLES FOR LEADS ANALYTICS AND REVIEWS

  // Review System Styles
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reviewStat: {
    alignItems: 'center',
    flex: 1,
  },
  reviewStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  reviewStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  inviteForm: {
    gap: 12,
  },
  orText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationCustomer: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  invitationDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  invitationExpiry: {
    fontSize: 12,
    color: '#F59E0B',
  },
  reviewCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  reviewCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Leads Analytics Styles
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statusItem: {
    alignItems: 'center',
    width: '30%',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  statusCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  sourcesList: {
    gap: 12,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceText: {
    fontSize: 14,
    color: '#374151',
  },
  sourceCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  leadsList: {
    gap: 12,
  },
  leadCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leadType: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  leadEvent: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  detailItem: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#374151',
  },
  statusUpdateSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  statusButtonActive: {
    backgroundColor: '#3B82F6',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  statusButtonTextActive: {
    color: '#FFFFFF',
  },

  // Stats Tab Styles
  chartPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  revenueCard: {
    backgroundColor: '#F0F9FF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  revenueTitle: {
    fontSize: 16,
    color: '#0EA5E9',
    marginBottom: 8,
  },
  revenueAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 8,
  },
  revenueSubtitle: {
    fontSize: 14,
    color: '#0EA5E9',
  },
  tipsList: {
    gap: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
}); 

function calculateTrends(periodLeads: any[], period: string) {
  throw new Error('Function not implemented.');
}

