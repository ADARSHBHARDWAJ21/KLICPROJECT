import { supabase } from '@/lib/supabase';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function ReviewScreen() {
  const { token } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const { data: invitation, error } = await supabase
        .from('review_invitations')
        .select('*, business_profiles(*)')
        .eq('token', token)
        .single();

      if (error || !invitation) {
        Alert.alert('Invalid Link', 'This review link is invalid or has expired.');
        return;
      }

      if (invitation.status !== 'pending') {
        Alert.alert('Already Submitted', 'This review has already been submitted.');
        return;
      }

      if (new Date(invitation.expires_at) < new Date()) {
        Alert.alert('Expired Link', 'This review link has expired.');
        return;
      }

      setBusiness(invitation.business_profiles);
      setLoading(false);

    } catch (error) {
      console.error('Error validating token:', error);
      Alert.alert('Error', 'Unable to load review form.');
    }
  };

  const submitReview = async () => {
    if (!rating || !customerName) {
      Alert.alert('Missing Information', 'Please provide a rating and your name.');
      return;
    }

    setSubmitting(true);
    try {
      // Create review
      const { error: reviewError } = await supabase
        .from('vendor_reviews')
        .insert([{
          business_profile_id: business.id,
          customer_name: customerName,
          rating: rating,
          comment: comment
        }]);

      if (reviewError) throw reviewError;

      // Update invitation status
      const { error: inviteError } = await supabase
        .from('review_invitations')
        .update({ status: 'completed' })
        .eq('token', token);

      if (inviteError) throw inviteError;

      Alert.alert(
        'Thank You!',
        'Your review has been submitted successfully.',
        [{ text: 'OK', onPress: () => router.replace('/') }]
      );

    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading review form...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leave a Review</Text>
        <Text style={styles.subtitle}>for {business?.business_name}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={styles.input}
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Enter your name"
        />

        <Text style={styles.label}>Rating</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <Feather
                name="star"
                size={32}
                color={star <= rating ? '#F59E0B' : '#E5E7EB'}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Your Review (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={comment}
          onChangeText={setComment}
          placeholder="Share your experience..."
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.submitButton, (!rating || !customerName) && styles.submitButtonDisabled]}
          onPress={submitReview}
          disabled={!rating || !customerName || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 16,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    padding: 20,
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  starButton: {
    padding: 8,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
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