// app/Dashboard/membership-details.tsx
import useAuth from '@/hooks/useauth';
import { supabase } from '@/lib/supabase';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MembershipDetails = () => {
  const router = useRouter();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);     // for CTA submit
  const [isFetching, setIsFetching] = useState(true);    // for initial data load

  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [membershipRequest, setMembershipRequest] = useState<any>(null);
  const [hasBusinessProfile, setHasBusinessProfile] = useState<boolean>(true);

  useEffect(() => {
    if (user?.id) {
      fetchBusinessProfileData(user.id);
    } else {
      setIsFetching(false);
      setHasBusinessProfile(false);
    }
  }, [user]);

  const fetchBusinessProfileData = async (userId: string) => {
    setIsFetching(true);
    try {
      // 1) Business profile
      const { data: businessProfileData, error: profileError } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.log('Error fetching profile:', profileError.message);
        setHasBusinessProfile(false);
        setBusinessProfile(null);
        setMembershipRequest(null);
        return;
      }

      if (!businessProfileData) {
        setHasBusinessProfile(false);
        setBusinessProfile(null);
        setMembershipRequest(null);
        return;
      }

      setBusinessProfile(businessProfileData);
      setHasBusinessProfile(true);

      // 2) Latest membership request (if any)
      const { data: requestData, error: requestError } = await supabase
        .from('membership_requests')
        .select('*')
        .eq('vendor_id', businessProfileData.id)
        .order('requested_at', { ascending: false })
        .limit(1);

      if (requestError) {
        console.log('Error fetching membership requests:', requestError.message);
        setMembershipRequest(null);
      } else if (requestData && requestData.length > 0) {
        setMembershipRequest(requestData[0]);
      } else {
        setMembershipRequest(null);
      }
    } catch (error) {
      console.error('Error fetching business profile data:', error);
      setHasBusinessProfile(false);
      setBusinessProfile(null);
      setMembershipRequest(null);
    } finally {
      setIsFetching(false);
    }
  };

  // Map DB -> UI flags
  const isMember = businessProfile?.is_premium_member === true;

  // With your boolean schema, we distinguish pending vs rejected by reviewed_at
  const hasPendingRequest =
    !!membershipRequest &&
    membershipRequest.is_approved === false &&
    !membershipRequest.reviewed_at;

  const wasRejected =
    !!membershipRequest &&
    membershipRequest.is_approved === false &&
    !!membershipRequest.reviewed_at;

  const handleRequestMembership = async () => {
    if (!hasBusinessProfile) {
      Alert.alert(
        'Business Profile Required',
        'You need to create a business profile before requesting membership.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create Profile', onPress: () => router.push('/Dashboard/BuisnessProfille') },
        ]
      );
      return;
    }

    if (hasPendingRequest) {
      Alert.alert(
        'Request Already Submitted',
        'You already have a pending membership request. We will review it and contact you shortly.'
      );
      return;
    }

    if (isMember) {
      Alert.alert(
        'Membership Already Active',
        'You already have an active Wedemption Premium membership.'
      );
      return;
    }

    setIsLoading(true);
    try {
      // Insert new request; let DB default is_approved = FALSE represent "pending"
      const { data, error } = await supabase
        .from('membership_requests')
        .insert([
          {
            vendor_id: businessProfile.id,
            business_name: businessProfile.business_name,
            contact_name: businessProfile.contact_person || 'Business Owner',
            contact_email: businessProfile.email,
            contact_phone: businessProfile.phone,
            // is_approved omitted → DEFAULT FALSE
            // reviewed_at null → treated as pending in UI
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setMembershipRequest(data);

      Alert.alert(
        'Request Submitted',
        'Your Wedemption Premium membership request has been submitted for manual review. We will contact you once it is approved.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error requesting membership:', error);
      Alert.alert('Error', 'Failed to submit membership request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateROI = () => {
    const minLeads = 40;
    const maxLeads = 70;
    const avgLeads = (minLeads + maxLeads) / 2;
    const membershipCost = 10999;
    const costPerLead = membershipCost / avgLeads;

    return {
      minLeads,
      maxLeads,
      avgLeads: Math.round(avgLeads),
      costPerLead: Math.round(costPerLead),
    };
  };

  const roiData = calculateROI();

  const renderStatusIndicator = () => {
    if (!hasBusinessProfile) {
      return (
        <View style={[styles.statusContainer, styles.statusInactive]}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <View>
            <Text style={styles.statusTitle}>Business Profile Required</Text>
            <Text style={styles.statusText}>
              You need to create a business profile before you can request membership
            </Text>
          </View>
        </View>
      );
    }

    if (isMember) {
      return (
        <View style={[styles.statusContainer, styles.statusActive]}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <View>
            <Text style={styles.statusTitle}>Premium Member</Text>
            <Text style={styles.statusText}>
              Your membership is active until {businessProfile?.membership_end_date
                ? new Date(businessProfile.membership_end_date).toLocaleDateString()
                : 'next year'}
            </Text>
          </View>
        </View>
      );
    }

    if (hasPendingRequest) {
      return (
        <View style={[styles.statusContainer, styles.statusPending]}>
          <Ionicons name="time" size={24} color="#F59E0B" />
          <View>
            <Text style={styles.statusTitle}>Pending Approval</Text>
            <Text style={styles.statusText}>
              Request submitted on {new Date(membershipRequest.requested_at).toLocaleDateString()}
            </Text>
            <Text style={styles.statusSubtext}>
              We will review your request and contact you shortly
            </Text>
          </View>
        </View>
      );
    }

    if (wasRejected) {
      return (
        <View style={[styles.statusContainer, styles.statusRejected]}>
          <Ionicons name="close-circle" size={24} color="#EF4444" />
          <View>
            <Text style={styles.statusTitle}>Request Not Approved</Text>
            <Text style={styles.statusText}>
              {membershipRequest.notes || 'Please contact support for more information.'}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.statusContainer, styles.statusInactive]}>
        <Ionicons name="information-circle" size={24} color="#3B82F6" />
        <Text style={styles.statusText}>Request premium membership to unlock more leads</Text>
      </View>
    );
  };

  // Loading screen for initial fetch
  if (isFetching) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // No business profile UI
  if (!hasBusinessProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wedemption Membership</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.noProfileContainer}>
          <MaterialIcons name="business-center" size={64} color="#9CA3AF" />
          <Text style={styles.noProfileTitle}>Business Profile Required</Text>
          <Text style={styles.noProfileText}>
            You need to create a business profile before you can access membership details.
          </Text>
          <TouchableOpacity
            style={styles.createProfileButton}
            onPress={() => router.push('/Dashboard/BuisnessProfille')}
          >
            <Text style={styles.createProfileButtonText}>Create Business Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main UI
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wedemption Membership</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status Indicator */}
        {renderStatusIndicator()}

        {/* Hero / Price */}
        <View style={styles.heroSection}>
          <View style={styles.pricingBox}>
            <Text style={styles.price}>₹10,999</Text>
            <Text style={styles.duration}>per year</Text>
          </View>
          <Text style={styles.heroText}>Premium visibility for your business</Text>
        </View>

        {/* ROI Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why This Plan is Worth It</Text>

          <View style={styles.roiCard}>
            <View style={styles.roiItem}>
              <View style={styles.roiIcon}>
                <MaterialIcons name="calculate" size={20} color="#3B82F6" />
              </View>
              <View style={styles.roiContent}>
                <Text style={styles.roiTitle}>Cost per Lead: ₹{roiData.costPerLead}</Text>
                <Text style={styles.roiDescription}>
                  Get leads for just ₹{roiData.costPerLead} compared to ₹500-1000 through other channels
                </Text>
              </View>
            </View>

            <View style={styles.roiItem}>
              <View style={styles.roiIcon}>
                <MaterialIcons name="people" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.roiContent}>
                <Text style={styles.roiTitle}>{roiData.minLeads}-{roiData.maxLeads} Qualified Leads</Text>
                <Text style={styles.roiDescription}>
                  High-intent couples actively looking to book vendors
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Benefits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Features</Text>

          {[
            { icon: 'leaderboard', title: '40-70 Qualified Leads Per Year', desc: 'Get high-quality leads from couples actively looking for vendors like you' },
            { icon: 'visibility', title: 'First Page Visibility', desc: 'Your profile appears on the first page of search results' },
            { icon: 'analytics', title: 'Analytics Access', desc: 'Track your profile performance with detailed analytics' },
            { icon: 'location-city', title: 'List in Multiple Cities', desc: 'Expand your reach by listing in multiple cities' },
            { icon: 'photo-library', title: 'Unlimited Photo Uploads', desc: 'Showcase your work with unlimited high-quality photos' },
            { icon: 'reviews', title: 'Pin Top Reviews', desc: 'Highlight your best reviews at the top of your profile' },
          ].map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                {/* @ts-ignore — allow dynamic icon names */}
                <MaterialIcons name={benefit.icon as any} size={24} color="#3B82F6" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>{benefit.desc}</Text>
              </View>
              {isMember && <Ionicons name="checkmark" size={20} color="#10B981" />}
            </View>
          ))}
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          {!isMember && !hasPendingRequest && (
            <TouchableOpacity
              style={[
                styles.ctaButton,
                isLoading && styles.ctaButtonDisabled,
                !hasBusinessProfile && styles.ctaButtonNotVerified,
              ]}
              onPress={handleRequestMembership}
              disabled={isLoading || !hasBusinessProfile}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaButtonText}>
                  {!hasBusinessProfile ? 'Create Business Profile First' : 'Request Membership'}
                </Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => router.push('/contact-support')}
          >
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// Styles (kept the same as you shared)
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
  noProfileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noProfileTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#374151',
  },
  noProfileText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 24,
  },
  createProfileButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createProfileButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  statusActive: {
    backgroundColor: '#ECFDF5',
  },
  statusPending: {
    backgroundColor: '#FFFBEB',
  },
  statusRejected: {
    backgroundColor: '#FEF2F2',
  },
  statusInactive: {
    backgroundColor: '#EFF6FF',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  heroSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pricingBox: {
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontSize: 36,
    fontWeight: '800',
    color: '#3B82F6',
  },
  duration: {
    fontSize: 16,
    color: '#6B7280',
  },
  heroText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  approvalWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  approvalWarningText: {
    color: '#92400E',
    marginLeft: 8,
    fontSize: 14,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  roiCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 16,
  },
  roiItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  roiIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roiContent: {
    flex: 1,
  },
  roiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  roiDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  ctaSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ctaButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  ctaButtonNotVerified: {
    backgroundColor: '#F59E0B',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  supportButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  supportButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MembershipDetails;
