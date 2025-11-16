import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Animated,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAuth from '@/hooks/useauth';

const { width, height } = Dimensions.get('window');

// Enhanced service icons with better mapping
const serviceIcons = {
    'All Vendors': 'grid',
    'Wedding Venues': 'business',
    'Photographers': 'camera',
    'Decorators': 'color-palette',
    'Catering': 'restaurant',
    'Makeup Artists': 'brush',
    'Mehndi Artists': 'hand-right',
    'DJ & Music': 'musical-notes',
    'Wedding Planners': 'calendar',
    'Invitation Cards': 'card',
    'Bridal Wear': 'woman',
};

const getServiceIcon = (serviceName) => {
    return serviceIcons[serviceName] || 'business';
};

// Separate Vendor Card Component for better performance
const VendorCard = React.memo(({ item, index, onPress }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    const renderRatingStars = (rating) => {
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
                    ({rating?.toFixed(1) || 0})
                </Text>
            </View>
        );
    };

    return (
        <Animated.View 
            style={[
                styles.vendorCard,
                index % 2 === 0 ? styles.vendorCardLeft : styles.vendorCardRight,
                { transform: [{ scale: scaleAnim }] }
            ]}
        >
            <TouchableOpacity 
                activeOpacity={0.9}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => onPress(item)}
                style={styles.vendorTouchable}
            >
                <View style={styles.vendorImageContainer}>
                    <Image 
                        source={{ 
                            uri: item.avatar_url || `https://placehold.co/300x200/8B4513/white?text=${encodeURIComponent(item.business_name?.charAt(0) || 'W')}` 
                        }} 
                        style={styles.vendorImage}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
                        style={styles.vendorGradient}
                    />
                    <View style={styles.vendorInfo}>
                        <Text style={styles.vendorName} numberOfLines={1}>{item.business_name}</Text>
                        <Text style={styles.vendorService}>{item.service?.name} • {item.city?.name}</Text>
                        {renderRatingStars(item.rating || 0)}
                        <Text style={styles.reviewCount}>{item.review_count || 0} reviews</Text>
                    </View>
                    {item.is_premium_member && (
                        <View style={styles.premiumBadge}>
                            <Ionicons name="diamond" size={12} color="#FFD700" />
                            <Text style={styles.premiumText}>Premium</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

// Separate Service Item Component
const ServiceItem = React.memo(({ item, isActive, onPress }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[
                    styles.serviceButton,
                    isActive && styles.serviceButtonActive
                ]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => onPress(item.name)}
                activeOpacity={0.8}
            >
                <View style={styles.serviceIconContainer}>
                    <Ionicons 
                        name={getServiceIcon(item.name)} 
                        size={22} 
                        color={isActive ? '#fff' : '#8B4513'} 
                    />
                </View>
                <Text style={[
                    styles.serviceText,
                    isActive && styles.serviceTextActive
                ]} numberOfLines={2}>
                    {item.name}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
});

export default function VendorsScreen() {
    const [selectedService, setSelectedService] = useState('All Vendors');
    const [selectedCity, setSelectedCity] = useState({ id: 0, name: 'Loading...' });
    const [vendors, setVendors] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [checkingCity, setCheckingCity] = useState(true);
    const { user } = useAuth();

    // Memoized data for better performance
    const memoizedServices = useMemo(() => services, [services]);
    const memoizedVendors = useMemo(() => vendors, [vendors]);

    // Check user's city from profile table
    const checkUserCity = async () => {
        try {
            if (!user) {
                await loadSavedCity();
                setCheckingCity(false);
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('city_id, cities(id, name)')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (data?.city_id && data.cities) {
                setSelectedCity({
                    id: data.cities.id,
                    name: data.cities.name
                });
            } else {
                await loadSavedCity();
            }
        } catch (error) {
            console.error('Error checking user city:', error);
            await loadSavedCity();
        } finally {
            setCheckingCity(false);
        }
    };

    const loadSavedCity = async () => {
        try {
            const savedCity = await AsyncStorage.getItem('selectedCity');
            if (savedCity) {
                setSelectedCity(JSON.parse(savedCity));
            } else {
                setSelectedCity({ id: 0, name: 'Select City' });
            }
        } catch (error) {
            console.error('Error loading saved city:', error);
            setSelectedCity({ id: 0, name: 'Select City' });
        }
    };

    // Fetch all services from database
    const fetchServices = async () => {
        try {
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .order('name');
            
            if (error) throw error;
            
            if (data?.length > 0) {
                setServices([{ id: 0, name: 'All Vendors' }, ...data]);
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        }
    };

    // Optimized vendor fetching with better error handling
    const fetchVendors = useCallback(async () => {
        if (!selectedService || !selectedCity || selectedCity.id === 0) {
            setLoading(false);
            return;
        }
        
        setRefreshing(true);
        try {
            let query = supabase
                .from('business_profiles')
                .select(`
                    *,
                    service:service_id (name),
                    city:city_id (name)
                `)
                .eq('is_premium_member', true);

            // Filter by service if not "All Vendors"
            if (selectedService !== 'All Vendors') {
                const { data: serviceData } = await supabase
                    .from('services')
                    .select('id')
                    .eq('name', selectedService)
                    .single();

                if (serviceData) {
                    query = query.eq('service_id', serviceData.id);
                }
            }

            // Filter by city
            query = query.eq('city_id', selectedCity.id);

            const { data, error } = await query;
            
            if (error) throw error;
            
            // Filter out expired memberships
            const isMembershipActive = (endDate) => {
                if (!endDate) return false;
                return new Date(endDate) >= new Date();
            };
            
            const activeVendors = data?.filter(vendor => 
                vendor.is_premium_member && 
                (!vendor.membership_end_date || isMembershipActive(vendor.membership_end_date))
            ) || [];
            
            setVendors(activeVendors);
        } catch (error) {
            console.error('Error fetching vendors:', error);
            setVendors([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedService, selectedCity]);

    // Initialize data
    useEffect(() => {
        const initializeData = async () => {
            await Promise.all([checkUserCity(), fetchServices()]);
        };
        initializeData();
    }, []);

    // Fetch vendors when dependencies change
    useEffect(() => {
        if (selectedService && selectedCity && selectedCity.id !== 0) {
            fetchVendors();
        }
    }, [selectedService, selectedCity, fetchVendors]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchVendors();
    }, [fetchVendors]);

    const openVendorDetails = (vendor) => {
        router.push({
            pathname: "/Dashboard/pro",
            params: { id: vendor.id.toString() }
        });
    };

    const handleServicePress = useCallback((serviceName) => {
        setSelectedService(serviceName);
    }, []);

    const handleCityPress = () => {
        router.push('/city-selection');
    };

    const renderVendorItem = useCallback(({ item, index }) => (
        <VendorCard 
            item={item} 
            index={index} 
            onPress={openVendorDetails}
        />
    ), []);

    const renderServiceItem = useCallback(({ item }) => (
        <ServiceItem 
            item={item} 
            isActive={selectedService === item.name}
            onPress={handleServicePress}
        />
    ), [selectedService]);

    // Loading state
    if (checkingCity) {
        return (
            <View style={styles.loadingContainer}>
                <LinearGradient
                    colors={['#fdfbf9', '#f8f2ec']}
                    style={StyleSheet.absoluteFill}
                />
                <ActivityIndicator size="large" color="#8B4513" />
                <Text style={styles.loadingText}>Setting up your experience...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#fdfbf9', '#f8f2ec']}
                style={styles.background}
            />
            
            {/* Enhanced Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.back()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={24} color="#8B4513" />
                </TouchableOpacity>
                
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Premium Vendors</Text>
                    <TouchableOpacity 
                        style={styles.citySelector}
                        onPress={handleCityPress}
                    >
                        <Ionicons name="location" size={16} color="#A67B5B" />
                        <Text style={styles.cityText}>{selectedCity.name}</Text>
                        <Ionicons name="chevron-down" size={14} color="#A67B5B" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                    style={styles.filterButton}
                    onPress={() => router.push('/vendors/filter')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="filter" size={22} color="#8B4513" />
                </TouchableOpacity>
            </View>

            {/* Services Section with Horizontal Scroll */}
            <View style={styles.servicesSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Browse Services</Text>
                    <Text style={styles.sectionSubtitle}>
                        {selectedService === 'All Vendors' ? 'All categories' : selectedService}
                    </Text>
                </View>
                
                <FlatList
                    data={memoizedServices}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderServiceItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.servicesContainer}
                    decelerationRate="fast"
                />
            </View>

            {/* No City Selected State */}
            {selectedCity.id === 0 && (
                <View style={styles.noCityContainer}>
                    <Ionicons name="location-outline" size={80} color="#C19A6B" />
                    <Text style={styles.noCityTitle}>Choose Your Location</Text>
                    <Text style={styles.noCityText}>
                        Select your city to discover amazing wedding vendors in your area
                    </Text>
                    <TouchableOpacity 
                        style={styles.primaryButton}
                        onPress={handleCityPress}
                    >
                        <Ionicons name="location" size={18} color="#fff" />
                        <Text style={styles.primaryButtonText}>Select City</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Vendors Grid */}
            {selectedCity.id !== 0 && (
                <View style={styles.vendorsSection}>
                    <View style={styles.vendorsHeader}>
                        <View>
                            <Text style={styles.vendorsTitle}>
                                {selectedService === 'All Vendors' ? 'Featured Vendors' : selectedService}
                            </Text>
                            <Text style={styles.vendorsSubtitle}>
                                In {selectedCity.name}
                            </Text>
                        </View>
                        <View style={styles.vendorsCountBadge}>
                            <Text style={styles.vendorsCount}>{memoizedVendors.length}</Text>
                        </View>
                    </View>

                    {loading ? (
                        <View style={styles.vendorsLoading}>
                            <ActivityIndicator size="large" color="#8B4513" />
                            <Text style={styles.loadingText}>Finding best vendors...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={memoizedVendors}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderVendorItem}
                            numColumns={2}
                            contentContainerStyle={styles.vendorsList}
                            refreshControl={
                                <RefreshControl 
                                    refreshing={refreshing} 
                                    onRefresh={onRefresh}
                                    colors={['#8B4513']}
                                    tintColor="#8B4513"
                                />
                            }
                            showsVerticalScrollIndicator={false}
                            initialNumToRender={8}
                            maxToRenderPerBatch={10}
                            windowSize={10}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="search-outline" size={70} color="#D4BFA8" />
                                    <Text style={styles.emptyTitle}>No Vendors Found</Text>
                                    <Text style={styles.emptyText}>
                                        {`We couldn't find any ${selectedService !== 'All Vendors' ? selectedService.toLowerCase() : ''} vendors in ${selectedCity.name}. Try changing your location or service category.`}
                                    </Text>
                                    <TouchableOpacity 
                                        style={styles.secondaryButton}
                                        onPress={() => setSelectedService('All Vendors')}
                                    >
                                        <Text style={styles.secondaryButtonText}>Show All Vendors</Text>
                                    </TouchableOpacity>
                                </View>
                            }
                        />
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F7F7',
        marginTop: 40,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F7F7F7',
    },
    loadingText: {
        marginTop: 16,
        color: '#8B4513',
        fontSize: 16,
        fontFamily: 'JakartaSans-SemiBold',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: '#F0E6DC',
    },
    backButton: {
        padding: 4
        ,
    },
    headerCenter: {
        alignItems: 'center',
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#8B4513',
        fontFamily: 'Jakarta-Bold',
        marginBottom: 4,
    },
    citySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139, 69, 19, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    cityText: {
        fontSize: 14,
        color: '#8B4513',
        fontFamily: 'JakartaSans-SemiBold',
        marginHorizontal: 6,
    },
    filterButton: {
        padding: 4,
    },
    servicesSection: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0E6DC',
    },
    sectionHeader: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        color: '#8B4513',
        fontFamily: 'Jakarta-Bold',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#A67B5B',
        fontFamily: 'JakartaSans',
    },
    servicesContainer: {
        paddingHorizontal: 10,
    },
    serviceButton: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 16,
        marginHorizontal: 6,
        borderWidth: 1.5,
        borderColor: '#F0E6DC',
        width: width * 0.28,
        minHeight: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    serviceButtonActive: {
        backgroundColor: '#8B4513',
        borderColor: '#8B4513',
        shadowColor: '#8B4513',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    serviceIconContainer: {
        marginBottom: 8,
    },
    serviceText: {
        color: '#8B4513',
        fontSize: 12,
        fontFamily: 'JakartaSans-SemiBold',
        textAlign: 'center',
        lineHeight: 14,
    },
    serviceTextActive: {
        color: '#fff',
    },
    vendorsSection: {
        flex: 1,
    },
    vendorsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    vendorsTitle: {
        fontSize: 22,
        color: '#8B4513',
        fontFamily: 'Jakarta-Bold',
        marginBottom: 4,
    },
    vendorsSubtitle: {
        fontSize: 14,
        color: '#A67B5B',
        fontFamily: 'JakartaSans',
    },
    vendorsCountBadge: {
        backgroundColor: 'rgba(139, 69, 19, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    vendorsCount: {
        fontSize: 16,
        color: '#8B4513',
        fontFamily: 'JakartaSans-SemiBold',
    },
    vendorsList: {
        paddingHorizontal: 12,
        paddingBottom: 20,
    },
    vendorCard: {
        flex: 1,
        margin: 6,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#f8f8f8',
    },
    vendorCardLeft: {
        marginRight: 3,
    },
    vendorCardRight: {
        marginLeft: 3,
    },
    vendorTouchable: {
        flex: 1,
    },
    vendorImageContainer: {
        position: 'relative',
        height: 200,
    },
    vendorImage: {
        width: '100%',
        height: '100%',
    },
    vendorGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    vendorInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
    },
    vendorName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
        fontFamily: 'Jakarta-Bold',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 4,
    },
    vendorService: {
        fontSize: 12,
        color: '#F5E6D8',
        marginBottom: 8,
        fontFamily: 'JakartaSans',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 4,
    },
    reviewCount: {
        fontSize: 11,
        color: '#F5E6D8',
        marginTop: 2,
        fontFamily: 'JakartaSans-SemiBold',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 4,
    },
    premiumBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139, 69, 19, 0.95)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    premiumText: {
        color: '#FFD700',
        fontSize: 11,
        fontWeight: 'bold',
        marginLeft: 4,
        fontFamily: 'JakartaSans-SemiBold',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 60,
    },
    emptyTitle: {
        fontSize: 20,
        color: '#8B4513',
        fontFamily: 'Jakarta-Bold',
        marginTop: 20,
        marginBottom: 12,
    },
    emptyText: {
        textAlign: 'center',
        color: '#A67B5B',
        fontSize: 15,
        fontFamily: 'JakartaSans',
        lineHeight: 22,
        marginBottom: 24,
    },
    noCityContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    noCityTitle: {
        fontSize: 24,
        color: '#8B4513',
        fontFamily: 'Jakarta-Bold',
        marginTop: 20,
        marginBottom: 12,
    },
    noCityText: {
        textAlign: 'center',
        color: '#A67B5B',
        fontSize: 16,
        fontFamily: 'JakartaSans',
        lineHeight: 24,
        marginBottom: 32,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8B4513',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 16,
        shadowColor: '#8B4513',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'JakartaSans-SemiBold',
        marginLeft: 8,
    },
    secondaryButton: {
        backgroundColor: 'rgba(139, 69, 19, 0.1)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#8B4513',
    },
    secondaryButtonText: {
        color: '#8B4513',
        fontSize: 15,
        fontFamily: 'JakartaSans-SemiBold',
    },
    vendorsLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
});