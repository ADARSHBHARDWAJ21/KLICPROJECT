// screens/SignIn.tsx
import { useSignIn } from "@clerk/clerk-expo";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, Text, TextInput, View, StyleSheet, TouchableOpacity } from "react-native";
import GoogleAuth from "../../lib/googleauth";

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [emailAddressId, setEmailAddressId] = useState<string | null>(null);

  async function handleSendOTP() {
    if (!isLoaded || !signIn) {
      Alert.alert("Error", "Please wait, system is initializing...");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Email required", "Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      const normalizedEmail = email.trim().toLowerCase();
      const result = await signIn.create({
        identifier: normalizedEmail,
      });

      if (result.status === "needs_first_factor") {
        const emailFactor = result.supportedFirstFactors?.find(
          (factor: any) => factor.strategy === "email_code"
        ) as any;

        if (!emailFactor?.emailAddressId) {
          Alert.alert("Sign in unavailable", "Email OTP is not available for this account.");
          return;
        }

        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailFactor.emailAddressId,
        });

        setEmailAddressId(emailFactor.emailAddressId);
        setOtpCode("");
        setOtpSent(true);
        Alert.alert("OTP sent", "Please check your email for the verification code.");
      } else if (result.status === "complete") {
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          router.replace("/(tabs)/home");
        }
      } else {
        Alert.alert("Sign in failed", "Unable to start email verification. Please try again.");
      }
    } catch (err: any) {
      console.error("Sign-in error:", err);
      const errorMessage = err.errors?.[0]?.message || err.message || "Unable to sign in";

      if (errorMessage.toLowerCase().includes("not found") || errorMessage.toLowerCase().includes("doesn't exist")) {
        Alert.alert(
          "Account not found",
          "No account matches this email. Create a new account to continue.",
          [
            { text: "Create account", onPress: () => router.replace("./sign-up") },
            { text: "OK" },
          ]
        );
      } else {
        Alert.alert("Sign in failed", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (!isLoaded || !signIn) return;

    try {
      setLoading(true);
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: otpCode.trim(),
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setOtpCode("");
        setOtpSent(false);
        setEmailAddressId(null);
        router.replace("/(tabs)/home");
      } else {
        Alert.alert("Verification failed", "Please check your code and try again.");
      }
    } catch (err: any) {
      Alert.alert("Verification error", err.errors?.[0]?.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    if (!isLoaded || !signIn) return;
    try {
      setLoading(true);
      if (emailAddressId) {
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId,
        });
      } else {
        await handleSendOTP();
        return;
      }
      Alert.alert("OTP resent", "A new verification code has been sent to your email.");
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  }

  if (otpSent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>Enter the code sent to {email}</Text>
        <TextInput
          placeholder="Enter OTP Code"
          value={otpCode}
          onChangeText={setOtpCode}
          keyboardType="number-pad"
          style={styles.input}
          maxLength={6}
        />
        <Button
          title={loading ? "Verifying..." : "Verify OTP"}
          onPress={handleVerifyOTP}
          disabled={!otpCode || otpCode.length !== 6 || loading}
        />
        <TouchableOpacity onPress={handleResendOTP} style={styles.resendButton}>
          <Text style={styles.resendText}>Resend OTP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setOtpSent(false);
            setOtpCode("");
            setEmailAddressId(null);
          }}
          style={styles.backButton}
        >
          <Text style={styles.backText}>Change Email</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.subtitle}>Enter your email to receive a one-time verification code.</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <Button
        title={loading ? "Sending..." : "Send OTP"}
        onPress={handleSendOTP}
        disabled={!email.trim() || loading}
      />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <GoogleAuth />

      <View style={styles.footer}>
        <Button
          title="Create account"
          onPress={() => router.replace("./sign-up")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderColor: "#ddd",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#666",
  },
  footer: {
    marginTop: 12,
    gap: 10,
  },
  resendButton: {
    marginTop: 15,
    padding: 10,
  },
  resendText: {
    color: "#007AFF",
    textAlign: "center",
  },
  backButton: {
    marginTop: 10,
    padding: 10,
  },
  backText: {
    color: "#666",
    textAlign: "center",
  },
});
