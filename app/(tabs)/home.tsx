import useAuth from '@/hooks/useauth';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');

type BusinessProfile = {
  id: number;
  business_name: string;
  business_email: string;
  phone: string;
  whatsapp_num: string;
  service_id: number;
  business_details: string;
  address: string;
  city: string;
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

type Category = {
  id: number;
  name: string;
  image: any;
  serviceType: string;
};

type City = {
  id: number;
  name: string;
};

export default function WeddingHomeScreen() {
  const [cities, setCities] = useState<City[]>([]);
  const [showCityModal, setShowCityModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City>({ id: 0, name: 'Select City' });
  const [selectedTab, setSelectedTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BusinessProfile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { user } = useAuth();

  // State for modals
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showCityModalFirst, setShowCityModalFirst] = useState(false);
  const [userName, setUserName] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [userGender, setUserGender] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [checkingUserData, setCheckingUserData] = useState(true);

  const tabs = ['All', 'Top Rated', 'Nearby'];

  const categories: Category[] = [
    { id: 1, name: 'Venues', image: require('../../assets/images/Welwed1.jpg'), serviceType: 'Wedding Venues' },
    { id: 2, name: 'Photographers', image: require('../../assets/images/photo.jpg'), serviceType: 'Photographers' },
    { id: 3, name: 'Decorators', image: require('../../assets/images/dec.jpg'), serviceType: 'Decorators' },
    { id: 4, name: 'Catering', image: require('../../assets/images/cat2.jpg'), serviceType: 'Catering' },
    { id: 5, name: 'Makeup Artist ', image: require('../../assets/images/makeup1.jpeg'), serviceType: 'Makeup Artists' },
    { id: 6, name: 'Bridal Wear', image: require('../../assets/images/cat3.jpg'), serviceType: 'Bridal Wear' },
  ];

  const tools = [
    { title: 'AI Budget Planner', action: "Let's get started →", screen: '/(tools)/budget-planner', icon: 'calculator' },
    { title: 'Your shortlisted vendors', action: 'Browse vendors →', screen: '/(tabs)/saved-vendors', icon: 'heart' },
  ];

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      await fetchCities();
      await checkUserCity();
    };

    initializeApp();
  }, []);

  // Automatic profile checking every 5 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (user) {
        checkUserCity();
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    if (selectedCity.id !== 0) {
      saveCityPreference(selectedCity);
      fetchBusinessProfiles();
      checkUserData();
    }
  }, [selectedCity, selectedTab, searchQuery]);

  // Check user's city from profile table
  const checkUserCity = async () => {
    try {
      if (!user) {
        // If no user, load from local storage
        await loadSavedCity();
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('city_id, cities(id, name)')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user city:', error);
        await loadSavedCity();
        return;
      }

      if (data && data.city_id && data.cities) {
        // User has a city set in profile
        const userCity = {
          id: data.cities.id,
          name: data.cities.name
        };
        setSelectedCity(userCity);
        setShowCityModalFirst(false);
      } else {
        // User doesn't have a city set, show modal
        await loadSavedCity();
        if (selectedCity.id === 0) {
          setShowCityModalFirst(true);
        }
      }
    } catch (error) {
      console.error('Error checking user city:', error);
      await loadSavedCity();
    } finally {
      setCheckingUserData(false);
    }
  };

  const checkUserData = async () => {
    try {
      if (!user) {
        setShowWelcomeModal(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('mobile_num, gender, full_name')
        .eq('id', user.id)
        .single();

      if (error || !data || !data.mobile_num || !data.gender || !data.full_name) {
        setShowWelcomeModal(true);
      } else {
        setShowWelcomeModal(false);
      }
    } catch (error) {
      setShowWelcomeModal(true);
    }
  };

  const saveUserDetails = async () => {
    if (!userName.trim() || !userMobile.trim() || !userGender) {
      Alert.alert('Error', 'Please complete all fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setIsSavingUser(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: userName.trim(),
          mobile_num: userMobile.trim(),
          gender: userGender.toLowerCase(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (error) throw error;

      Alert.alert('Success', 'Profile saved successfully!');
      setShowWelcomeModal(false);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setIsSavingUser(false);
    }
  };

  const loadSavedCity = async () => {
    try {
      const savedCity = await AsyncStorage.getItem('selectedCity');
      if (savedCity) {
        setSelectedCity(JSON.parse(savedCity));
      }
    } catch (error) {
      console.error('Error loading saved city:', error);
    }
  };

  const saveCityPreference = async (city: City) => {
    try {
      await AsyncStorage.setItem('selectedCity', JSON.stringify(city));
      
      // Also update user's profile if logged in
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            city_id: city.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating user city:', error);
        }
      }
    } catch (error) {
      console.error('Error saving city preference:', error);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const isMembershipActive = (endDate: string | null | undefined): boolean => {
    if (!endDate) return false;
    const today = new Date();
    const membershipEnd = new Date(endDate);
    return membershipEnd >= today;
  };

  const fetchBusinessProfiles = async () => {
    if (selectedCity.id === 0) return;
    
    setRefreshing(true);
    try {
      let query = supabase
        .from('business_profiles')
        .select(`
          *,
          service:service_id (name),
          city:city_id (name)
        `)
        .eq('city_id', selectedCity.id)
        .eq('is_premium_member', true);

      if (selectedTab === 'Top Rated') {
        query = query.order('rating', { ascending: false });
      } else if (selectedTab === 'Nearby') {
        query = query.order('rating', { ascending: false });
      }

      if (searchQuery) {
        query = query.ilike('business_name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      const activePremiumProfiles = data?.filter(profile => 
        profile.is_premium_member && 
        (!profile.membership_end_date || isMembershipActive(profile.membership_end_date))
      ) || [];
      
      setBusinessProfiles(activePremiumProfiles);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch business profiles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setShowCityModal(false);
    setShowCityModalFirst(false);
    saveCityPreference(city);
    checkUserData();
  };

  const parsePackageDetails = (packageDetails: string): Package[] => {
    try {
      if (!packageDetails) return [];
      const parsed = JSON.parse(packageDetails);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      return [];
    }
  };

  const filterBusinessByService = (serviceType: string) => {
    return businessProfiles.filter(profile => profile.service?.name === serviceType);
  };

  const addToCart = async (item: BusinessProfile) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to add vendors to your cart');
      router.push({ pathname: '/(auth)/sign-up' });
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .insert([{ user_id: user.id, business_id: item.id }]);
      
      if (error) throw error;
      
      Alert.alert('Added to Cart', `${item.business_name} has been added to your booking cart`);
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add to cart');
    }
  };

  const openDetails = (item: BusinessProfile) => {
    router.push({
      pathname: "/Dashboard/pro",
      params: { id: item.id.toString() }
    });
  };

  const renderRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={`full-${i}`} name="star" size={14} color="#FFD700" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={14} color="#FFD700" />);
    }
    
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#FFD700" />);
    }
    
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {stars}
        <Text style={{ marginLeft: 5, fontSize: 12, color: '#8B4513', fontFamily: 'JakartaSans' }}>({rating.toFixed(1)})</Text>
      </View>
    );
  };

  function onRefresh() {
    setRefreshing(true);
    fetchBusinessProfiles();
  }

  if (loading || checkingUserData) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#f9f3ee', '#f5e9dd']}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color="#C19A6B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f9f3ee', '#f5e9dd']}
        style={styles.background}
      />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.appName}>WEDEPTION</Text>
          </View>
          <TouchableOpacity 
            style={styles.cartButton}
            onPress={() => router.push("/(tabs)/booking")}
          >
            <Ionicons name="cart-outline" size={24} color="#8B4513" />
          </TouchableOpacity>
        </View>

        {/* Location Selector */}
        <TouchableOpacity 
          style={styles.locationContainer}
          onPress={() => setShowCityModal(true)}
        >
          <Ionicons name="location-sharp" size={22} color="#5700a2ff" />
          <Text style={styles.locationText}>{selectedCity.name}</Text>
          <Ionicons name="chevron-down" size={16} color="#8B4513" />
        </TouchableOpacity>

        {/* City Selection Modal (First Time) */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showCityModalFirst}
          onRequestClose={() => {}}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Select Your City</Text>
              <Text style={styles.modalSubtitle}>Please select your city to continue using WEDEPTION</Text>
              {cities.length === 0 ? (
                <Text style={styles.noCitiesText}>No cities found.</Text>
              ) : (
                <FlatList
                  data={cities}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.cityItem}
                      onPress={() => handleCitySelect(item)}
                    >
                      <Text style={styles.cityText}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                  style={styles.cityList}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* City Selection Modal (Regular) */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showCityModal}
          onRequestClose={() => setShowCityModal(false)}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Select Your City</Text>
              {cities.length === 0 ? (
                <Text style={styles.noCitiesText}>No cities found.</Text>
              ) : (
                <FlatList
                  data={cities}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.cityItem}
                      onPress={() => handleCitySelect(item)}
                    >
                      <Text style={styles.cityText}>{item.name}</Text>
                      {selectedCity.id === item.id && (
                        <Ionicons name="checkmark" size={20} color="#C19A6B" />
                      )}
                    </TouchableOpacity>
                  )}
                  style={styles.cityList}
                />
              )}
              <Pressable
                style={[styles.button, styles.buttonClose]}
                onPress={() => setShowCityModal(false)}
              >
                <Text style={styles.textStyle}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Welcome Modal for Profile Completion */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showWelcomeModal && !!user && selectedCity.id !== 0}
          onRequestClose={() => {}}
        >
          <View style={styles.centeredView}>
            <View style={styles.welcomeModalView}>
              <Text style={styles.welcomeTitle}>Complete Your Profile</Text>
              <Text style={styles.welcomeSubtitle}>
                Please complete your profile to continue using WEDEPTION
              </Text>
              
              <TextInput
                style={styles.input}
                placeholder="Your Name"
                placeholderTextColor="#A67B5B"
                value={userName}
                onChangeText={setUserName}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Mobile Number"
                placeholderTextColor="#A67B5B"
                value={userMobile}
                onChangeText={setUserMobile}
                keyboardType="phone-pad"
              />
              
              <View style={styles.genderContainer}>
                <Text style={styles.genderLabel}>Gender:</Text>
                <View style={styles.genderOptions}>
                  <TouchableOpacity
                    style={[styles.genderOption, userGender === 'Male' && styles.genderOptionSelected]}
                    onPress={() => setUserGender('Male')}
                  >
                    <Text style={[styles.genderText, userGender === 'Male' && styles.genderTextSelected]}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderOption, userGender === 'Female' && styles.genderOptionSelected]}
                    onPress={() => setUserGender('Female')}
                  >
                    <Text style={[styles.genderText, userGender === 'Female' && styles.genderTextSelected]}>Female</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderOption, userGender === 'Other' && styles.genderOptionSelected]}
                    onPress={() => setUserGender('Other')}
                  >
                    <Text style={[styles.genderText, userGender === 'Other' && styles.genderTextSelected]}>Other</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveUserDetails}
                disabled={isSavingUser}
              >
                {isSavingUser ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.welcomeButtonText}>Save & Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <TouchableOpacity 
  style={styles.searchContainer}
  onPress={() => router.push({
    pathname: "../others/search",
    params: { 
      initialCity: selectedCity.name,
      cityId: selectedCity.id.toString()
    }
  })}
>
  <Ionicons name="search" size={20} color="#8B4513" style={{ marginHorizontal: 12 }} />
  <Text style={styles.searchPlaceholder}>Search vendors, venues...</Text>
</TouchableOpacity>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.map((cat) => (
            <TouchableOpacity 
              key={cat.id} 
              style={styles.categoryCard}
              onPress={() => router.push({
                pathname: "/(tabs)/vendors",
                params: { 
                  serviceType: cat.serviceType,
                  city: selectedCity.name
                }
              })}
            >
              <View style={styles.categoryImageContainer}>
                <Image source={cat.image} style={styles.categoryImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.categoryGradient}
                />
              </View>
              <Text style={styles.categoryLabel}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Wedding Tools */}
        <Text style={styles.sectionTitle}>Wedding Planning Tools</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolsScroll}>
          {tools.map((tool, index) => (
            <TouchableOpacity
              key={index}
              style={styles.toolCard}
              onPress={() => router.push(tool.screen as any)}
            >
              <LinearGradient
                colors={['#C19A6B', '#8B4513']}
                style={styles.toolGradient}
              />
              <Ionicons name={tool.icon as any} size={24} color="#fff" style={styles.toolIcon} />
              <Text style={styles.toolTitle}>{tool.title}</Text>
              <Text style={styles.toolAction}>{tool.action}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Vendors */}
        <View style={styles.featuredHeader}>
          <Text style={styles.sectionTitle}>Featured Vendors</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/vendors")}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        
        {selectedCity.id === 0 ? (
          <View style={styles.noCityContainer}>
            <Text style={styles.noCityText}>Please select a city to view vendors</Text>
          </View>
        ) : (
          <FlatList
            data={businessProfiles.slice(0, 5)}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.featuredList}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => openDetails(item)}>
                <View style={styles.featuredCard}>
                  <Image 
                    source={{ uri: item.avatar_url || 'https://placehold.co/300x200?text=Wedding+Vendor' }} 
                    style={styles.featuredImage} 
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.featuredGradient}
                  />
                  <View style={styles.featuredInfo}>
                    <Text style={styles.featuredName} numberOfLines={1}>{item.business_name}</Text>
                    <Text style={styles.featuredService}>{item.service?.name}</Text>
                    {renderRatingStars(item.rating || 0)}
                  </View>
                  {item.is_premium_member && (
                    <View style={styles.premiumBadge}>
                      <Ionicons name="diamond" size={12} color="#FFD700" />
                      <Text style={styles.premiumText}>Premium</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No premium vendors in {selectedCity.name}. Check back later or try a different city.</Text>
            }
          />
        )}

        {/* Business Sections */}
        {selectedCity.id !== 0 && categories.map((category) => {
          const filteredBusinesses = filterBusinessByService(category.serviceType);
          if (filteredBusinesses.length === 0) return null;

          return (
            <View key={category.id} style={styles.categorySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{category.name} in {selectedCity.name}</Text>
                <TouchableOpacity
                  onPress={() => router.push({
                    pathname: "/(tabs)/vendors",
                    params: { 
                      serviceType: category.serviceType,
                      city: selectedCity.name
                    }
                  })}
                >
                  <Text style={styles.seeAll}>See all →</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.venueScroll}>
                {filteredBusinesses.map((business) => (
                  <TouchableOpacity 
                    key={business.id} 
                    onPress={() => openDetails(business)}
                    style={styles.venueCardWrapper}
                  >
                    <View style={styles.venueCard}>
                      <Image 
                        source={{ uri: business.avatar_url || 'https://placehold.co/200x150?text=Wedding+Vendor' }} 
                        style={styles.venueImage} 
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={styles.venueGradient}
                      />
                      <View style={styles.venueContent}>
                        <Text style={styles.venueName} numberOfLines={1}>{business.business_name}</Text>
                        <Text style={styles.venueLocation} numberOfLines={1}>{business.address}</Text>
                        {renderRatingStars(business.rating || 0)}
                        <Text style={styles.reviewCount}>{business.review_count || 0} reviews</Text>
                      </View>
                      {business.is_premium_member && (
                        <View style={styles.premiumBadgeSmall}>
                          <Ionicons name="diamond" size={10} color="#FFD700" />
                          <Text style={styles.premiumTextSmall}>Premium</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      {/* Blocking Overlay */}
      {(showCityModalFirst || showWelcomeModal) && (
        <View style={styles.blockingOverlay}>
          <Text style={styles.blockingText}>
            {showCityModalFirst ? 'Please select your city to continue' : 'Please complete your profile to continue'}
          </Text>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffffff',
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
    paddingTop: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f3ee',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerContent: {
    flex: 1,
  },
  appName: {
    fontSize: 22,
    color: '#8B4513',
    fontFamily: 'Jakarta-Bold',
  },
  cartButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 16,
    color: '#6b0084',
    marginHorizontal: 6,
    fontFamily: 'Jakarta-SemiBold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#A67B5B',
    fontFamily: 'Jakarta-SemiBold',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#8B4513',
    marginHorizontal: 16,
    marginBottom: 12,
    fontFamily: 'Jakarta-Bold',
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
  },
  categoryCard: {
    width: 80,
    marginRight: 12,
    alignItems: 'center',
  },
  categoryImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 6,
    position: 'relative',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
  },
  categoryLabel: {
    fontSize: 11,
    color: '#8B4513',
    textAlign: 'center',
    fontFamily: 'Jakarta-SemiBold',
  },
  toolsScroll: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  toolCard: {
    width: 140,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 14,
    minHeight: 100,
    position: 'relative',
  },
  toolGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
  },
  toolIcon: {
    marginBottom: 6,
  },
  toolTitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 6,
    fontFamily: 'Jakarta-SemiBold',
  },
  toolAction: {
    color: '#F5E6D8',
    fontSize: 12,
    fontFamily: 'Jakarta-SemiBold',
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  seeAll: {
    color: '#C19A6B',
    fontSize: 12,
    fontFamily: 'Jakarta-SemiBold',
  },
  featuredList: {
    paddingHorizontal: 16,
  },
  featuredCard: {
    width: 200,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: 120,
  },
  featuredGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  featuredInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  featuredName: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 2,
    fontFamily: 'Jakarta-Bold',
  },
  featuredService: {
    fontSize: 11,
    color: '#F5E6D8',
    marginBottom: 4,
    fontFamily: 'Jakarta-SemiBold',
  },
  categorySection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  venueScroll: {
    paddingHorizontal: 16,
  },
  venueCardWrapper: {
    marginRight: 10,
  },
  venueCard: {
    width: 150,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    backgroundColor: '#fff',
  },
  venueImage: {
    width: '100%',
    height: 100,
  },
  venueGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  venueContent: {
    padding: 8,
  },
  venueName: {
    fontSize: 12,
    color: '#8B4513',
    marginBottom: 2,
    fontFamily: 'Jakarta-SemiBold',
  },
  venueLocation: {
    fontSize: 10,
    color: '#A67B5B',
    marginBottom: 4,
    fontFamily: 'JakartaSans',
  },
  reviewCount: {
    fontSize: 10,
    color: '#A67B5B',
    fontFamily: 'Jakarta-SemiBold',
  },
  premiumBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 69, 19, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  premiumBadgeSmall: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 69, 19, 0.9)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  premiumText: {
    color: '#FFD700',
    fontSize: 10,
    marginLeft: 2,
    fontFamily: 'Jakarta-SemiBold',
  },
  premiumTextSmall: {
    color: '#FFD700',
    fontSize: 8,
    marginLeft: 1,
    fontFamily: 'JakartaSansSemiBold',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 16,
    color: '#A67B5B',
    fontSize: 14,
    paddingHorizontal: 16,
    fontFamily: 'Jakarta-SemiBold',
  },
  noCityContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noCityText: {
    color: '#A67B5B',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'JakartaSans',
  },
  // Modal styles
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  welcomeModalView: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    color: '#8B4513',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: 'Jakarta-Bold',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#A67B5B',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'JakartaSans',
  },
  welcomeTitle: {
    fontSize: 18,
    color: '#8B4513',
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: 'Jakarta-Bold',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#A67B5B',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'JakartaSans',
  },
  cityItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6DB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cityText: {
    fontSize: 16,
    color: '#5D4037',
    fontFamily: 'Jakarta-SemiBold',
  },
  cityList: {
    maxHeight: 300,
  },
  noCitiesText: {
    textAlign: 'center',
    color: '#A67B5B',
    fontSize: 14,
    marginVertical: 20,
  },
  button: {
    borderRadius: 8,
    padding: 12,
    elevation: 2,
    marginTop: 12,
  },
  buttonClose: {
    backgroundColor: '#A67B5B',
  },
  textStyle: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Jakarta-SemiBold',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E8D6C9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: '#8B4513',
    backgroundColor: '#FFF',
    fontFamily: 'Jakarta-SemiBold',
  },
  genderContainer: {
    marginBottom: 16,
  },
  genderLabel: {
    fontSize: 14,
    color: '#8B4513',
    marginBottom: 8,
    fontFamily: 'Jakarta-SemiBold',
  },
  genderOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderOption: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8D6C9',
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  genderOptionSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  genderText: {
    color: '#8B4513',
    fontSize: 12,
    fontFamily: 'JakartaSans',
  },
  genderTextSelected: {
    color: '#FFF',
    fontFamily: 'Jakarta-SemiBold',
  },
  saveButton: {
    backgroundColor: '#000f51',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  welcomeButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Jakarta-SemiBold',
  },
  blockingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  blockingText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    padding: 16,
    fontFamily: 'Jakarta-SemiBold',
  },
  // Rating stars
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});