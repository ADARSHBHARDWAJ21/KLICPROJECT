// screens/SignUp.tsx
import { useSignUp } from "@clerk/clerk-expo";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, Text, TextInput, View, StyleSheet, TouchableOpacity } from "react-native";
import GoogleAuth from "../../lib/googleauth";

export default function SignUp() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  async function handleSendOTP() {
    if (!isLoaded || !signUp) {
      Alert.alert("Error", "Please wait, system is initializing...");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Email required", "Please enter a valid email address");
      return;
    }

    try {
      setSending(true);
      const normalizedEmail = email.trim().toLowerCase();

      await signUp.create({
        emailAddress: normalizedEmail,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setOtpSent(true);
      Alert.alert("OTP sent", "Please check your email for the verification code.");
    } catch (err: any) {
      console.error("Sign up error:", err);
      const message = err.errors?.[0]?.message || err.message || "Failed to start sign up";

      if (message.toLowerCase().includes("already") || message.toLowerCase().includes("exists")) {
        Alert.alert(
          "Account already exists",
          "Please sign in with this email or use Google.",
          [
            {
              text: "Go to sign in",
              onPress: () => router.replace("./sign-in"),
            },
            { text: "OK" },
          ]
        );
      } else {
        Alert.alert("Sign up error", message);
      }
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyOTP() {
    if (!isLoaded || !signUp) {
      Alert.alert("Error", "Please wait, system is initializing...");
      return;
    }

    if (!otpCode || otpCode.trim().length !== 6) {
      Alert.alert("Invalid code", "Enter the 6-digit code sent to your email.");
      return;
    }

    try {
      setSending(true);
      const verification = await signUp.attemptEmailAddressVerification({
        code: otpCode.trim(),
      });

      if (verification.status === "complete") {
        const sessionId = verification.createdSessionId || signUp.createdSessionId;
        if (sessionId) {
          await setActive({ session: sessionId });
        }
        setOtpCode("");
        setOtpSent(false);
        router.replace("/(tabs)/home");
      } else {
        Alert.alert("Verification pending", "Please wait a moment and try again.");
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || err.message || "Invalid verification code";
      if (errorMessage.toLowerCase().includes("expired")) {
        Alert.alert("Code expired", "Request a new code to continue.", [
          { text: "Resend", onPress: handleResendOTP },
          { text: "Cancel" },
        ]);
      } else {
        Alert.alert("Verification error", errorMessage);
      }
    } finally {
      setSending(false);
    }
  }

  async function handleResendOTP() {
    if (!isLoaded || !signUp) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      Alert.alert("OTP resent", "A new verification code has been sent to your email.");
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.message || "Failed to resend OTP");
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
          title={sending ? "Verifying..." : "Verify OTP"}
          onPress={handleVerifyOTP}
          disabled={!otpCode || otpCode.length !== 6 || sending}
        />
        <TouchableOpacity onPress={handleResendOTP} style={styles.resendButton}>
          <Text style={styles.resendText}>Resend OTP</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setOtpSent(false)} style={styles.backButton}>
          <Text style={styles.backText}>Change Email</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Use your email address to create an account with a one-time code.</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <Button title={sending ? "Sending OTP..." : "Send OTP"} onPress={handleSendOTP} disabled={!email.trim() || sending} />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <GoogleAuth />

      <View style={styles.footer}>
        <Button title="Already have an account? Sign in" onPress={() => router.replace("./sign-in")} />
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
    marginTop: 20,
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
