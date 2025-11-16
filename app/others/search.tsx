import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Keyboard
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
  city_id: number;
  cities?: {
    name: string;
  };
};

type City = {
  id: number;
  name: string;
};

type Service = {
  id: number;
  name: string;
};

type SearchSuggestion = {
  type: 'business' | 'service' | 'city';
  name: string;
  business?: BusinessProfile;
};

export default function SearchScreen() {
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<City>({ 
    id: parseInt(params.cityId as string) || 0, 
    name: params.initialCity as string || 'All Cities' 
  });
  const [selectedService, setSelectedService] = useState<Service>({ 
    id: 0, 
    name: 'All Services' 
  });
  const [businessProfiles, setBusinessProfiles] = useState<BusinessProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<BusinessProfile[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCityFilter, setShowCityFilter] = useState(false);
  const [showServiceFilter, setShowServiceFilter] = useState(false);

  const searchInputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchCities();
    fetchServices();
    fetchAllBusinessProfiles();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() && businessProfiles.length > 0) {
      generateSearchSuggestions();
      setShowSuggestions(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      setShowSuggestions(false);
      filterProfiles();
    }
  }, [searchQuery, businessProfiles]);

  useEffect(() => {
    if (!showSuggestions) {
      filterProfiles();
    }
  }, [selectedCity, selectedService, businessProfiles]);

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

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchAllBusinessProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select(`
          *,
          service:service_id (name),
          cities:city_id (name)
        `)
        .order('rating', { ascending: false });

      if (error) throw error;
      
      console.log('Fetched business profiles:', data?.length);
      
      // Filter active premium members
      const activeProfiles = data?.filter(profile => 
        profile.is_premium_member && 
        isMembershipActive(profile.membership_end_date)
      ) || [];
      
      setBusinessProfiles(activeProfiles);
    } catch (error) {
      console.error('Error fetching business profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const isMembershipActive = (endDate: string | null | undefined): boolean => {
    if (!endDate) return false;
    const today = new Date();
    const membershipEnd = new Date(endDate);
    return membershipEnd >= today;
  };

  const generateSearchSuggestions = () => {
    if (!searchQuery.trim() || businessProfiles.length === 0) {
      setSearchSuggestions([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const suggestions: SearchSuggestion[] = [];

    // Business name suggestions (prioritize starting matches)
    const businessMatches = businessProfiles.filter(profile =>
      profile.business_name.toLowerCase().includes(query)
    ).sort((a, b) => {
      // Prioritize names that start with the search query
      const aStartsWith = a.business_name.toLowerCase().startsWith(query);
      const bStartsWith = b.business_name.toLowerCase().startsWith(query);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // Then sort by rating
      return (b.rating || 0) - (a.rating || 0);
    }).slice(0, 5); // Limit to 5 suggestions

    businessMatches.forEach(profile => {
      suggestions.push({
        type: 'business',
        name: profile.business_name,
        business: profile
      });
    });

    // Service name suggestions
    const uniqueServices = new Set<string>();
    businessProfiles.forEach(profile => {
      if (profile.service?.name.toLowerCase().includes(query)) {
        uniqueServices.add(profile.service.name);
      }
    });
    
    Array.from(uniqueServices).slice(0, 3).forEach(serviceName => {
      suggestions.push({
        type: 'service',
        name: serviceName
      });
    });

    // City name suggestions
    const cityMatches = cities.filter(city =>
      city.name.toLowerCase().includes(query)
    ).slice(0, 2);
    
    cityMatches.forEach(city => {
      suggestions.push({
        type: 'city',
        name: city.name
      });
    });

    setSearchSuggestions(suggestions);
  };

  const filterProfiles = () => {
    let filtered = [...businessProfiles];

    // Filter by city if a specific city is selected
    if (selectedCity.id !== 0) {
      filtered = filtered.filter(profile => profile.city_id === selectedCity.id);
    }

    // Filter by service if a specific service is selected
    if (selectedService.id !== 0) {
      filtered = filtered.filter(profile => profile.service_id === selectedService.id);
    }

    // Filter by search query if not showing suggestions
    if (searchQuery.trim() && !showSuggestions) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(profile =>
        profile.business_name.toLowerCase().includes(query) ||
        profile.service?.name.toLowerCase().includes(query) ||
        profile.business_details.toLowerCase().includes(query) ||
        profile.address.toLowerCase().includes(query) ||
        profile.cities?.name.toLowerCase().includes(query)
      );
    }

    // Sort: starting matches first, then by rating
    filtered.sort((a, b) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const aStartsWith = a.business_name.toLowerCase().startsWith(query);
        const bStartsWith = b.business_name.toLowerCase().startsWith(query);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
      }
      
      // Then by city match if city is selected
      if (selectedCity.id !== 0) {
        const aInSelectedCity = a.city_id === selectedCity.id;
        const bInSelectedCity = b.city_id === selectedCity.id;
        
        if (aInSelectedCity && !bInSelectedCity) return -1;
        if (!aInSelectedCity && bInSelectedCity) return 1;
      }
      
      // Finally by rating
      return (b.rating || 0) - (a.rating || 0);
    });

    setFilteredProfiles(filtered);
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'business' && suggestion.business) {
      setSearchQuery(suggestion.business.business_name);
      setShowSuggestions(false);
      // Auto-search when business is selected from suggestions
      setTimeout(() => {
        filterProfiles();
      }, 100);
    } else if (suggestion.type === 'service') {
      const service = services.find(s => s.name === suggestion.name);
      if (service) {
        setSelectedService(service);
        setSearchQuery('');
      }
    } else if (suggestion.type === 'city') {
      const city = cities.find(c => c.name === suggestion.name);
      if (city) {
        setSelectedCity(city);
        setSearchQuery('');
      }
    }
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  const handleSearchSubmit = () => {
    setShowSuggestions(false);
    filterProfiles();
    Keyboard.dismiss();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllBusinessProfiles();
    setRefreshing(false);
  };

  const openDetails = (item: BusinessProfile) => {
    router.push({
      pathname: "/Dashboard/pro",
      params: { id: item.id.toString() }
    });
  };

  const clearAllFilters = () => {
    setSelectedCity({ id: 0, name: 'All Cities' });
    setSelectedService({ id: 0, name: 'All Services' });
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);
    
    return (
      <Text>
        <Text>{before}</Text>
        <Text style={styles.highlightedText}>{match}</Text>
        <Text>{after}</Text>
      </Text>
    );
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
        <Text style={{ marginLeft: 5, fontSize: 12, color: '#8B4513', fontFamily: 'JakartaSans' }}>
          ({rating.toFixed(1)})
        </Text>
      </View>
    );
  };

  const renderSuggestionItem = ({ item }: { item: SearchSuggestion }) => (
    <TouchableOpacity 
      style={styles.suggestionItem}
      onPress={() => handleSuggestionSelect(item)}
    >
      <Ionicons 
        name={
          item.type === 'business' ? 'business' : 
          item.type === 'service' ? 'grid' : 'location'
        } 
        size={20} 
        color="#C19A6B" 
        style={styles.suggestionIcon}
      />
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionText}>
          {highlightMatch(item.name, searchQuery)}
        </Text>
        <Text style={styles.suggestionType}>
          {item.type === 'business' ? 'Business' : 
           item.type === 'service' ? 'Service' : 'City'}
        </Text>
      </View>
      <Ionicons name="arrow-forward" size={16} color="#A67B5B" />
    </TouchableOpacity>
  );

  const renderBusinessItem = ({ item }: { item: BusinessProfile }) => (
    <TouchableOpacity onPress={() => openDetails(item)} style={styles.businessCard}>
      <Image 
        source={{ uri: item.avatar_url || 'https://placehold.co/300x200?text=Wedding+Vendor' }} 
        style={styles.businessImage} 
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.businessGradient}
      />
      
      <View style={styles.businessInfo}>
        <View style={styles.businessHeader}>
          <Text style={styles.businessName} numberOfLines={1}>
            {highlightMatch(item.business_name, searchQuery)}
          </Text>
          {item.is_premium_member && (
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={12} color="#FFD700" />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.businessService}>{item.service?.name}</Text>
        <Text style={styles.businessLocation} numberOfLines={1}>
          <Ionicons name="location-sharp" size={12} color="#8B4513" />
          {item.cities?.name || 'Unknown City'}
        </Text>
        
        <View style={styles.ratingContainer}>
          {renderRatingStars(item.rating || 0)}
          <Text style={styles.reviewCount}>({item.review_count || 0} reviews)</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const hasActiveFilters = selectedCity.id !== 0 || selectedService.id !== 0 || searchQuery.trim() !== '';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f9f3ee', '#f5e9dd']}
        style={styles.background}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#8B4513" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Vendors</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8B4513" style={styles.searchIcon} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search vendors, services, locations..."
          placeholderTextColor="#A67B5B"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
          autoFocus={true}
          returnKeyType="search"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => {
            setSearchQuery('');
            setShowSuggestions(false);
          }}>
            <Ionicons name="close-circle" size={20} color="#A67B5B" style={styles.searchIcon} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Search Suggestions */}
      {showSuggestions && searchSuggestions.length > 0 && (
        <Animated.View style={[styles.suggestionsContainer, { opacity: fadeAnim }]}>
          <Text style={styles.suggestionsTitle}>Search Suggestions</Text>
          <FlatList
            data={searchSuggestions}
            keyExtractor={(item, index) => `${item.type}-${item.name}-${index}`}
            renderItem={renderSuggestionItem}
            style={styles.suggestionsList}
          />
        </Animated.View>
      )}

      {/* Filters Section */}
      {!showSuggestions && (
        <>
          {/* Filters Header */}
          <View style={styles.filtersHeader}>
            <Text style={styles.filtersTitle}>Filters</Text>
            {hasActiveFilters && (
              <TouchableOpacity onPress={clearAllFilters} style={styles.clearAllButton}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filters Row */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.filtersContainer}
            contentContainerStyle={styles.filtersContent}
          >
            {/* City Filter */}
            <TouchableOpacity 
              style={[
                styles.filterButton,
                selectedCity.id !== 0 && styles.filterButtonActive
              ]}
              onPress={() => {
                setShowCityFilter(!showCityFilter);
                setShowServiceFilter(false);
                setShowSuggestions(false);
              }}
            >
              <Ionicons 
                name="location-sharp" 
                size={16} 
                color={selectedCity.id !== 0 ? "#FFF" : "#8B4513"} 
              />
              <Text style={[
                styles.filterButtonText,
                selectedCity.id !== 0 && styles.filterButtonTextActive
              ]}>
                {selectedCity.name}
              </Text>
              <Ionicons 
                name="chevron-down" 
                size={14} 
                color={selectedCity.id !== 0 ? "#FFF" : "#8B4513"} 
              />
            </TouchableOpacity>

            {/* Service Filter */}
            <TouchableOpacity 
              style={[
                styles.filterButton,
                selectedService.id !== 0 && styles.filterButtonActive
              ]}
              onPress={() => {
                setShowServiceFilter(!showServiceFilter);
                setShowCityFilter(false);
                setShowSuggestions(false);
              }}
            >
              <Ionicons 
                name="grid" 
                size={16} 
                color={selectedService.id !== 0 ? "#FFF" : "#8B4513"} 
              />
              <Text style={[
                styles.filterButtonText,
                selectedService.id !== 0 && styles.filterButtonTextActive
              ]}>
                {selectedService.name}
              </Text>
              <Ionicons 
                name="chevron-down" 
                size={14} 
                color={selectedService.id !== 0 ? "#FFF" : "#8B4513"} 
              />
            </TouchableOpacity>
          </ScrollView>

          {/* City Filter Dropdown */}
          {showCityFilter && (
            <View style={styles.filterDropdown}>
              <Text style={styles.filterDropdownTitle}>Select City</Text>
              <FlatList
                data={[{ id: 0, name: 'All Cities' }, ...cities]}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.filterOption}
                    onPress={() => {
                      setSelectedCity(item);
                      setShowCityFilter(false);
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedCity.id === item.id && styles.filterOptionTextSelected
                    ]}>
                      {item.name}
                    </Text>
                    {selectedCity.id === item.id && (
                      <Ionicons name="checkmark" size={16} color="#C19A6B" />
                    )}
                  </TouchableOpacity>
                )}
                style={styles.filterList}
              />
            </View>
          )}

          {/* Service Filter Dropdown */}
          {showServiceFilter && (
            <View style={styles.filterDropdown}>
              <Text style={styles.filterDropdownTitle}>Select Service</Text>
              <FlatList
                data={[{ id: 0, name: 'All Services' }, ...services]}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.filterOption}
                    onPress={() => {
                      setSelectedService(item);
                      setShowServiceFilter(false);
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedService.id === item.id && styles.filterOptionTextSelected
                    ]}>
                      {item.name}
                    </Text>
                    {selectedService.id === item.id && (
                      <Ionicons name="checkmark" size={16} color="#C19A6B" />
                    )}
                  </TouchableOpacity>
                )}
                style={styles.filterList}
              />
            </View>
          )}

          {/* Active Filters Tags */}
          {hasActiveFilters && (
            <View style={styles.activeFiltersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.activeFilters}>
                  {selectedCity.id !== 0 && (
                    <View style={styles.activeFilterTag}>
                      <Text style={styles.activeFilterText}>City: {selectedCity.name}</Text>
                      <TouchableOpacity onPress={() => setSelectedCity({ id: 0, name: 'All Cities' })}>
                        <Ionicons name="close-circle" size={16} color="#8B4513" />
                      </TouchableOpacity>
                    </View>
                  )}
                  {selectedService.id !== 0 && (
                    <View style={styles.activeFilterTag}>
                      <Text style={styles.activeFilterText}>Service: {selectedService.name}</Text>
                      <TouchableOpacity onPress={() => setSelectedService({ id: 0, name: 'All Services' })}>
                        <Ionicons name="close-circle" size={16} color="#8B4513" />
                      </TouchableOpacity>
                    </View>
                  )}
                  {searchQuery.trim() !== '' && (
                    <View style={styles.activeFilterTag}>
                      <Text style={styles.activeFilterText}>Search: "{searchQuery}"</Text>
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={16} color="#8B4513" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* Results */}
      <View style={styles.resultsContainer}>
        {!showSuggestions && (
          <Text style={styles.resultsCount}>
            {filteredProfiles.length} vendors found
            {selectedCity.id !== 0 && ` in ${selectedCity.name}`}
            {selectedService.id !== 0 && ` for ${selectedService.name}`}
          </Text>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#C19A6B" style={styles.loader} />
        ) : (
          <FlatList
            data={showSuggestions ? [] : filteredProfiles}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderBusinessItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !showSuggestions ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={64} color="#A67B5B" />
                  <Text style={styles.emptyTitle}>No vendors found</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery ? `No results for "${searchQuery}"` : 'No vendors available'}
                    {selectedCity.id !== 0 && ` in ${selectedCity.name}`}
                    {selectedService.id !== 0 && ` for ${selectedService.name}`}
                  </Text>
                  <Text style={styles.emptyHint}>
                    Try adjusting your search criteria or clear filters
                  </Text>
                  {hasActiveFilters && (
                    <TouchableOpacity onPress={clearAllFilters} style={styles.clearFiltersButton}>
                      <Text style={styles.clearFiltersText}>Clear All Filters</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null
            }
          />
        )}
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 22,
    color: '#8B4513',
    fontFamily: 'Jakarta-Bold',
    letterSpacing: 0.5,
  },
  headerPlaceholder: {
    width: 34,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 10,
  },
  searchIcon: {
    marginHorizontal: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#8B4513',
    paddingHorizontal: 10,
    fontFamily: 'Jakarta-SemiBold',
  },
  suggestionsContainer: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 10,
    maxHeight: 300,
  },
  suggestionsTitle: {
    fontSize: 14,
    color: '#A67B5B',
    fontFamily: 'Jakarta-SemiBold',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6DB',
  },
  suggestionsList: {
    maxHeight: 250,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6DB',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 16,
    color: '#8B4513',
    fontFamily: 'Jakarta-SemiBold',
    marginBottom: 2,
  },
  suggestionType: {
    fontSize: 12,
    color: '#A67B5B',
    fontFamily: 'JakartaSans',
  },
  highlightedText: {
    backgroundColor: '#FFF8E1',
    color: '#8B4513',
    fontWeight: 'bold',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  filtersTitle: {
    fontSize: 18,
    color: '#8B4513',
    fontFamily: 'Jakarta-Bold',
  },
  clearAllButton: {
    padding: 5,
  },
  clearAllText: {
    color: '#C19A6B',
    fontSize: 14,
    fontFamily: 'Jakarta-SemiBold',
  },
  filtersContainer: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  filtersContent: {
    paddingRight: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8D6C9',
  },
  filterButtonActive: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#8B4513',
    fontFamily: 'Jakarta-SemiBold',
    marginHorizontal: 6,
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  filterDropdown: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8D6C9',
  },
  filterDropdownTitle: {
    fontSize: 16,
    color: '#8B4513',
    fontFamily: 'Jakarta-Bold',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6DB',
  },
  filterList: {
    maxHeight: 150,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6DB',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#5D4037',
    fontFamily: 'JakartaSans',
  },
  filterOptionTextSelected: {
    color: '#C19A6B',
    fontFamily: 'Jakarta-SemiBold',
  },
  activeFiltersContainer: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  activeFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5E6D8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#8B4513',
    fontFamily: 'Jakarta-SemiBold',
    marginRight: 6,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsCount: {
    fontSize: 16,
    color: '#A67B5B',
    fontFamily: 'Jakarta-SemiBold',
    marginBottom: 15,
    textAlign: 'center',
  },
  loader: {
    marginTop: 50,
  },
  businessCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  businessImage: {
    width: '100%',
    height: 180,
  },
  businessGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  businessInfo: {
    padding: 16,
  },
  businessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B4513',
    flex: 1,
    fontFamily: 'Jakarta-Bold',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 69, 19, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  premiumText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
    fontFamily: 'Jakarta-SemiBold',
  },
  businessService: {
    fontSize: 14,
    color: '#C19A6B',
    fontFamily: 'Jakarta-SemiBold',
    marginBottom: 4,
  },
  businessLocation: {
    fontSize: 12,
    color: '#A67B5B',
    fontFamily: 'JakartaSans',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewCount: {
    fontSize: 12,
    color: '#A67B5B',
    marginLeft: 8,
    fontFamily: 'JakartaSans',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    color: '#8B4513',
    fontFamily: 'Jakarta-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#A67B5B',
    fontFamily: 'JakartaSans',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#A67B5B',
    fontFamily: 'JakartaSans',
    textAlign: 'center',
    marginBottom: 20,
  },
  clearFiltersButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  clearFiltersText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Jakarta-SemiBold',
  },
});
