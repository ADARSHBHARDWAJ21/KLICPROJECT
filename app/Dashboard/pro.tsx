import useAuth from '@/hooks/useauth';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

type BusinessProfile = {
  id: string;
  business_name: string;
  business_email: string;
  phone: string;
  whatsapp_num: string;
  service_id: number;
  business_details: string;
  address: string;
  city: any;
  images: string[];
  avatar_url: string;
  rating: number;
  review_count: number;
  service: {
    name: string;
  };
  package_details?: string;
  why_choose_us?: string;
  policies?: string;
  exclusive_details?: string;
  about_brand?: string;
  is_premium_member: boolean;
  membership_end_date?: string;
};

type Package = {
  name: string;
  price: string;
  description: string;
  features: string[];
};

// Skeleton Loader Component
const SkeletonLoader = () => (
  <View style={styles.skeletonContainer}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonHeader}>
      <View style={styles.skeletonTextLarge} />
      <View style={styles.skeletonTextMedium} />
      <View style={styles.skeletonTextSmall} />
    </View>
    <View style={styles.skeletonSection}>
      <View style={styles.skeletonSectionTitle} />
      <View style={styles.skeletonText} />
      <View style={styles.skeletonText} />
      <View style={[styles.skeletonText, { width: '60%' }]} />
    </View>
    <View style={styles.skeletonSection}>
      <View style={styles.skeletonSectionTitle} />
      {[1, 2, 3].map(i => (
        <View key={i} style={styles.skeletonPackage}>
          <View style={styles.skeletonPackageHeader}>
            <View style={styles.skeletonTextMedium} />
            <View style={styles.skeletonTextSmall} />
          </View>
        </View>
      ))}
    </View>
  </View>
);

// Animated Button Component
const AnimatedButton = ({ children, onPress, style, disabled = false }) => {
  const animatedValue = new Animated.Value(1);
  
  const handlePressIn = () => {
    Animated.spring(animatedValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(animatedValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
  
  return (
    <Animated.View style={{ transform: [{ scale: animatedValue }] }}>
      <TouchableOpacity 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={style}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Package Card Component
const PackageCard = ({ pkg, onInquire }) => {
  const [expanded, setExpanded] = useState(false);
  
  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };
  
  return (
    <View style={styles.packageCard}>
      <TouchableOpacity 
        style={styles.packageHeader}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.packageTitleContainer}>
          <Text style={styles.packageName}>{pkg.name || 'Package'}</Text>
          {pkg.price && <Text style={styles.packagePrice}>₹{pkg.price}</Text>}
        </View>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={24} 
          color="#8B4513" 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.packageDetails}>
          {pkg.description && (
            <Text style={styles.packageDescription}>{pkg.description}</Text>
          )}
          
          {pkg.features && pkg.features.length > 0 && (
            <View style={styles.featuresList}>
              {pkg.features.map((feature, i) => (
                <View key={i} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#C19A6B" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          )}
          
          <AnimatedButton
            style={styles.inquireButton}
            onPress={() => onInquire(pkg.name || 'Package')}
          >
            <Text style={styles.inquireButtonText}>Inquire About Package</Text>
          </AnimatedButton>
        </View>
      )}
    </View>
  );
};

export default function VendorDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [vendor, setVendor] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { user, isLoading: authLoading } = useAuth();
  const viewStartTime = useRef<number>(0);
  const [isUserReady, setIsUserReady] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isFavorite, setIsFavorite] = useState(false);

  // Wait for auth to finish loading
  useEffect(() => {
    if (!authLoading) {
      setIsUserReady(true);
    }
  }, [authLoading]);

  useEffect(() => {
    if (id && isUserReady) {
      fetchVendorDetails();
      trackProfileView();
      viewStartTime.current = Date.now();
    }

    return () => {
      if (viewStartTime.current) {
        const viewDuration = Math.floor((Date.now() - viewStartTime.current) / 1000);
        trackEngagement('profile_view', viewDuration);
      }
    };
  }, [id, isUserReady]);

  const fetchVendorDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select(`
          *,
          service:service_id (name),
          city:city_id (name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setVendor(data as unknown as BusinessProfile);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch vendor details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch customer info from profiles table
  const getCustomerInfo = async () => {
    if (!user) {
      return { customerName: null, customerPhone: null };
    }

    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('link_name, mobile_..., email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return { customerName: null, customerPhone: null };
      }

      return {
        customerName: (userProfile as any)?.link_name || null,
        customerPhone: (userProfile as any)?.['mobile_...'] || null,
      };
    } catch (error) {
      console.error('Failed to fetch customer info:', error);
      return { customerName: null, customerPhone: null };
    }
  };

  // Check if the same action already exists today
  const checkExistingLeadToday = async (leadType: string, contactMethod?: string | null) => {
    if (!user) return false;

    try {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('vendor_leads')
        .select('id')
        .eq('vendor_id', id as string)
        .eq('user_id', user.id)
        .eq('lead_type', leadType)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .limit(1);

      if (contactMethod) {
        query = query.eq('contact_method', contactMethod);
      } else {
        query = query.is('contact_method', null);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error checking existing leads:', error);
        return false;
      }

      return !!data && data.length > 0;
    } catch (error) {
      console.error('Failed to check existing leads:', error);
      return false;
    }
  };

  // Track Profile View
  const trackProfileView = async () => {
    try {
      let customerName = null;
      let customerPhone = null;

      if (user) {
        const customerInfo = await getCustomerInfo();
        customerName = customerInfo.customerName;
        customerPhone = customerInfo.customerPhone;
        
        const hasExistingView = await checkExistingLeadToday('profile_view');
        if (hasExistingView) return;
      }

      const { error } = await supabase
        .from('vendor_leads')
        .insert([{
          vendor_id: id as string,
          user_id: user?.id || null,
          customer_name: customerName,
          customer_phone: customerPhone,
          lead_type: 'profile_view',
          contact_method: 'profile_view',
          details: {
            source: 'vendor_details_open',
            timestamp: new Date().toISOString(),
            anonymous: !user,
            user_authenticated: !!user
          }
        }]);

      if (error) {
        console.error('Error tracking profile view:', error);
        if (error.code === '23505') {
          console.log('Profile view already tracked today');
        }
      }
    } catch (error) {
      console.error('Failed to track profile view:', error);
    }
  };

  // Track Engagement (duration analytics)
  const trackEngagement = async (actionType: string, duration?: number) => {
    try {
      const { error } = await supabase
        .from('user_engagement')
        .insert([{
          user_id: user?.id || null,
          vendor_id: id as string,
          action_type: actionType,
          duration: duration,
          created_at: new Date().toISOString(),
        }]);

      if (error) console.error('Error tracking engagement:', error);
    } catch (error) {
      console.error('Failed to track engagement:', error);
    }
  };

  // Track Lead (only once per day per action + contact method)
  const trackLead = async (leadType: string, contactMethod?: string | null, details?: any) => {
    try {
      if (!user && leadType !== 'profile_view') {
        Alert.alert('Login Required', 'Please login to contact this vendor');
        return false;
      }

      if (user) {
        const hasExistingLead = await checkExistingLeadToday(leadType, contactMethod ?? null);
        if (hasExistingLead) {
          return true;
        }
      }

      const { customerName, customerPhone } = await getCustomerInfo();

      const { error } = await supabase
        .from('vendor_leads')
        .insert([{
          vendor_id: id as string,
          user_id: user?.id || null,
          customer_name: customerName,
          customer_phone: customerPhone,
          lead_type: leadType,
          contact_method: contactMethod,
          details: {
            ...details,
            timestamp: new Date().toISOString(),
            anonymous: !user,
            user_authenticated: !!user
          }
        }]);

      if (error) {
        console.error('Error tracking lead:', error);
        if (error.code === '23505') {
          return true;
        }
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to track lead:', error);
      return false;
    }
  };

  // Handlers
  const handleCall = async () => {
    const success = await trackLead('call', 'phone', { phone_number: vendor?.phone });
    if (success) {
      if (vendor?.phone) Linking.openURL(`tel:${vendor.phone}`);
    } else {
      Alert.alert('Error', 'Could not track your inquiry. Please try again.');
    }
  };

  const handleWhatsApp = async () => {
    const success = await trackLead('whatsapp', 'whatsapp', { whatsapp_number: vendor?.whatsapp_num });
    if (success) {
      if (vendor?.whatsapp_num) Linking.openURL(`https://wa.me/${vendor.whatsapp_num}`);
    } else {
      Alert.alert('Error', 'Could not track your inquiry. Please try again.');
    }
  };

  const handleEmail = async () => {
    const success = await trackLead('email', 'email', { email: vendor?.business_email });
    if (success) {
      if (vendor?.business_email) Linking.openURL(`mailto:${vendor.business_email}`);
    } else {
      Alert.alert('Error', 'Could not track your inquiry. Please try again.');
    }
  };

  const handlePackageInquiry = async (packageName: string) => {
    const success = await trackLead('package_inquiry', 'package', {
      package_name: packageName,
      vendor_name: vendor?.business_name,
    });

    if (success) {
      if (vendor?.business_email) {
        Linking.openURL(
          `mailto:${vendor.business_email}?subject=Inquiry about ${encodeURIComponent(
            packageName
          )} package&body=Hello, I am interested in your ${encodeURIComponent(
            packageName
          )} package. Please send me more details.`
        );
      }
    } else {
      Alert.alert('Error', 'Could not send your inquiry. Please try again.');
    }
  };

  const toggleFavorite = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsFavorite(!isFavorite);
    // Here you would also update the favorite status in your database
  };

  const parsePackageDetails = (packageDetails: string): Package[] => {
    try {
      if (!packageDetails) return [];
      const parsed = JSON.parse(packageDetails);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error('Error parsing package details:', error);
      return [];
    }
  };

  const renderRatingStars = (rating: number) => {
    const stars = [] as React.ReactNode[];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={`full-${i}`} name="star" size={16} color="#FFD700" />);
    }

    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={16} color="#FFD700" />);
    }

    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#FFD700" />);
    }

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {stars}
        <Text style={{ marginLeft: 5, fontSize: 14, color: '#666' }}>({rating?.toFixed(1) || 0})</Text>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            {vendor?.about_brand && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About Brand</Text>
                <Text style={styles.description}>{vendor.about_brand}</Text>
              </View>
            )}
            
            {vendor?.why_choose_us && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Why Choose Us</Text>
                <Text style={styles.description}>{vendor.why_choose_us}</Text>
              </View>
            )}
            
            {vendor?.policies && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Policies</Text>
                <Text style={styles.description}>{vendor.policies}</Text>
              </View>
            )}
          </>
        );
      
      case 'packages':
        return vendor?.package_details ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Packages & Pricing</Text>
            {parsePackageDetails(vendor.package_details).map((pkg, index) => (
              <PackageCard 
                key={index} 
                pkg={pkg} 
                onInquire={handlePackageInquiry} 
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptySection}>
            <Ionicons name="pricetag-outline" size={48} color="#C19A6B" />
            <Text style={styles.emptySectionText}>No packages available</Text>
          </View>
        );
      
      case 'gallery':
        return vendor?.images && vendor.images.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gallery</Text>
            <View style={styles.galleryGrid}>
              {vendor.images.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setActiveImageIndex(index)}
                  style={styles.galleryGridItem}
                >
                  <Image source={{ uri: image }} style={styles.galleryGridImage} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptySection}>
            <Ionicons name="images-outline" size={48} color="#C19A6B" />
            <Text style={styles.emptySectionText}>No gallery images available</Text>
          </View>
        );
      
      case 'reviews':
        return (
          <View style={styles.emptySection}>
            <Ionicons name="star-outline" size={48} color="#C19A6B" />
            <Text style={styles.emptySectionText}>No reviews yet</Text>
          </View>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#f9f3ee', '#f5e9dd']} style={styles.background} />
        <SkeletonLoader />
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={styles.errorContainer}>
        <LinearGradient colors={['#f9f3ee', '#f5e9dd']} style={styles.background} />
        <Text style={styles.errorText}>Vendor not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#f9f3ee', '#f5e9dd']} style={styles.background} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.headerImageContainer}>
          <Image
            source={{ uri: vendor.avatar_url || 'https://placehold.co/400x300?text=Wedding+Vendor' }}
            style={styles.headerImage}
          />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.headerGradient} />

          <AnimatedButton
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </AnimatedButton>

          <AnimatedButton
            style={styles.cartButton}
            onPress={() => router.push('/(tabs)/booking')}
          >
            <Ionicons name="cart-outline" size={24} color="#fff" />
          </AnimatedButton>

          <AnimatedButton
            style={styles.favoriteButton}
            onPress={toggleFavorite}
          >
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorite ? "#FF3B30" : "#fff"} 
            />
          </AnimatedButton>

          {vendor.is_premium_member && (
            <View style={styles.premiumBadgeLarge}>
              <Ionicons name="diamond" size={16} color="#FFD700" />
              <Text style={styles.premiumTextLarge}>Premium Vendor</Text>
            </View>
          )}

          {/* Image indicators if multiple images */}
          {vendor.images && vendor.images.length > 1 && (
            <View style={styles.imageIndicators}>
              {vendor.images.map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.imageIndicator,
                    index === activeImageIndex && styles.activeImageIndicator
                  ]} 
                />
              ))}
            </View>
          )}
        </View>

        {/* Vendor Info Header */}
        <View style={styles.vendorHeader}>
          <View style={styles.vendorTitleContainer}>
            <Text style={styles.vendorName}>{vendor.business_name}</Text>
            <Text style={styles.vendorService}>{vendor.service?.name}</Text>
            <View style={styles.ratingContainer}>
              {renderRatingStars(vendor.rating || 0)}
              <Text style={styles.reviewCount}>({vendor.review_count || 0} reviews)</Text>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
        >
          {['Overview', 'Packages', 'Gallery', 'Reviews'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab.toLowerCase() && styles.activeTab
              ]}
              onPress={() => setActiveTab(tab.toLowerCase())}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab.toLowerCase() && styles.activeTabText
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.contactItem}>
            <Ionicons name="location-outline" size={20} color="#8B4513" />
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactLabel}>Address</Text>
              <Text style={styles.contactValue}>{vendor.address}</Text>
            </View>
          </View>

          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={20} color="#8B4513" />
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>{vendor.phone}</Text>
            </View>
          </View>

          {vendor.whatsapp_num && (
            <View style={styles.contactItem}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactLabel}>WhatsApp</Text>
                <Text style={styles.contactValue}>{vendor.whatsapp_num}</Text>
              </View>
            </View>
          )}

          <View style={styles.contactItem}>
            <Ionicons name="mail-outline" size={20} color="#8B4513" />
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>{vendor.business_email}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Contact Bar */}
      <View style={styles.stickyContactBar}>
        <AnimatedButton
          style={[styles.contactAction, styles.callAction]}
          onPress={handleCall}
        >
          <Ionicons name="call" size={20} color="white" />
          <Text style={styles.contactActionText}>Call</Text>
        </AnimatedButton>

        {vendor.whatsapp_num && (
          <AnimatedButton
            style={[styles.contactAction, styles.whatsappAction]}
            onPress={handleWhatsApp}
          >
            <Ionicons name="logo-whatsapp" size={20} color="white" />
            <Text style={styles.contactActionText}>WhatsApp</Text>
          </AnimatedButton>
        )}

        <AnimatedButton
          style={[styles.contactAction, styles.messageAction]}
          onPress={handleEmail}
        >
          <Ionicons name="mail" size={20} color="white" />
          <Text style={styles.contactActionText}>Message</Text>
        </AnimatedButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop:24,
    flex: 1,
    backgroundColor: '#fff',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 80, // Space for sticky contact bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
  },
  errorText: {
    fontSize: 18,
    color: '#8B4513',
    marginBottom: 20,
  },
  backButtonText: {
    color: '#C19A6B',
    fontSize: 16,
  },
  headerImageContainer: {
    position: 'relative',
    height: 380,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartButton: {
    position: 'absolute',
    top: 50,
    right: 70,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vendorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: '#fff',
  },
  vendorTitleContainer: {
    flex: 1,
  },
  vendorName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B4513',
    marginBottom: 4,
  },
  vendorService: {
    fontSize: 16,
    color: '#A67B5B',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewCount: {
    fontSize: 14,
    color: '#A67B5B',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#8B4513',
    marginBottom: 15,
    fontFamily:'Jakarta-Bold',
  },
  description: {
    fontSize: 16,
    color: '#5D4037',
    lineHeight: 24,
    fontFamily:'Jakarta',
    
  },
  packageCard: {
    backgroundColor: '#F9F3EE',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageTitleContainer: {
    flex: 1,
  },
  packageName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#C19A6B',
  },
  packageDetails: {
    marginTop: 15,
  },
  packageDescription: {
    fontSize: 14,
    color: '#5D4037',
    marginBottom: 15,
    lineHeight: 20,
  },
  featuresList: {
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#5D4037',
    marginLeft: 8,
    flex: 1,
  },
  inquireButton: {
    backgroundColor: '#E8D6C9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  inquireButtonText: {
    color: '#8B4513',
    fontWeight: '600',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  contactTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: '#A67B5B',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    color: '#5D4037',
  },
  premiumBadgeLarge: {
    position: 'absolute',
    top: 15,
    left: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 69, 19, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 10,
  },
  premiumTextLarge: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  activeImageIndicator: {
    backgroundColor: '#fff',
    width: 16,
  },
  tabBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabBarContent: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 16,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B4513',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#8B4513',
    fontWeight: '600',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  galleryGridItem: {
    width: '48%',
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
  },
  galleryGridImage: {
    width: '100%',
    height: '100%',
  },
  emptySection: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  emptySectionText: {
    textAlign: 'center',
    marginTop: 16,
    color: '#8B4513',
    fontSize: 16,
  },
  stickyContactBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  contactAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginHorizontal: 15,
  },
  callAction: {
    backgroundColor: '#000000ff',
  },
  whatsappAction: {
    backgroundColor: '#25D366',
  },
  messageAction: {
    backgroundColor: '#8B4513',
  },
  contactActionText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  // Skeleton loader styles
  skeletonContainer: {
    padding: 16,
  },
  skeletonImage: {
    height: 300,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
  },
  skeletonHeader: {
    marginBottom: 24,
  },
  skeletonTextLarge: {
    height: 24,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
  },
  skeletonTextMedium: {
    height: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 8,
    width: '50%',
  },
  skeletonTextSmall: {
    height: 14,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 8,
    width: '30%',
  },
  skeletonSection: {
    marginBottom: 24,
  },
  skeletonSectionTitle: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 16,
    width: '40%',
  },
  skeletonText: {
    height: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 8,
    width: '100%',
  },
  skeletonPackage: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  skeletonPackageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
});