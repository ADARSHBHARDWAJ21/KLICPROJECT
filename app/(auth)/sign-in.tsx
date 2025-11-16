// screens/SignIn.tsx
import { useSignIn } from "@clerk/clerk-expo";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, Text, TextInput, View, StyleSheet, TouchableOpacity } from "react-native";
import GoogleAuth from "../../lib/googleauth";

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [usePassword, setUsePassword] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  async function handleSignIn() {
    if (!isLoaded) {
      Alert.alert("Error", "Please wait, system is initializing...");
      return;
    }

    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    if (usePassword && !password) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    try {
      setLoading(true);
      
      if (usePassword) {
        // Password-based sign in
        console.log("Attempting password sign-in for:", email);
        const result = await signIn.create({
          identifier: email.trim(),
          password: password,
        });

        console.log("Sign-in result status:", result.status);
        console.log("Sign-in status:", signIn.status);

        if (result.status === "complete") {
          if (result.createdSessionId) {
            try {
              await setActive({ session: result.createdSessionId });
              console.log("Session activated successfully");
              router.replace("/(tabs)/home");
            } catch (activeErr: any) {
              console.error("Error activating session:", activeErr);
              Alert.alert("Sign in error", "Failed to activate session. Please try again.");
            }
          } else {
            console.error("No session ID in result");
            Alert.alert("Sign in failed", "Unable to create session. Please try again.");
          }
        } else {
          console.log("Sign-in not complete, status:", result.status);
          Alert.alert("Sign in failed", `Unable to complete sign in. Status: ${result.status}`);
        }
      } else {
        // Email OTP-based sign in
        console.log("Attempting email OTP sign-in for:", email);
        const result = await signIn.create({
          identifier: email.trim(),
        });

        if (result.status === "needs_first_factor") {
          // Get the email address ID from supported first factors
          const emailFactor = result.supportedFirstFactors?.find(
            (factor: any) => factor.strategy === "email_code"
          ) as any;
          
          if (emailFactor && emailFactor.emailAddressId) {
            await signIn.prepareFirstFactor({
              strategy: "email_code",
              emailAddressId: emailFactor.emailAddressId,
            });
            setOtpSent(true);
            Alert.alert("OTP Sent", "Please check your email for the verification code.");
          } else {
            Alert.alert("Error", "Email code factor not available. Please try password sign-in.");
          }
        } else {
          console.log("Unexpected status for OTP sign-in:", result.status);
          Alert.alert("Sign in failed", "Unable to initiate OTP sign-in. Please try again.");
        }
      }
    } catch (err: any) {
      console.error("Sign-in error:", err);
      const errorMessage = err.errors?.[0]?.message || err.message || "Unable to sign in";
      
      // Provide more helpful error messages
      if (errorMessage.includes("not found") || errorMessage.includes("doesn't exist")) {
        Alert.alert(
          "Account Not Found",
          "No account found with this email. Please check your email or create a new account.",
          [
            {
              text: "Create Account",
              onPress: () => router.replace("./sign-up"),
            },
            { text: "OK" },
          ]
        );
      } else if (errorMessage.includes("password") || errorMessage.includes("incorrect")) {
        Alert.alert("Invalid Credentials", "The email or password you entered is incorrect. Please try again.");
      } else {
        Alert.alert("Sign in failed", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (!isLoaded) return;

    try {
      setLoading(true);
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: otpCode,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("../(tabs)/home.tsx");
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
      // Get the email address ID from supported first factors
      const emailFactor = signIn.supportedFirstFactors?.find(
        (factor: any) => factor.strategy === "email_code"
      ) as any;
      
      if (emailFactor && emailFactor.emailAddressId) {
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailFactor.emailAddressId,
        });
        Alert.alert("OTP Resent", "A new verification code has been sent to your email.");
      } else {
        Alert.alert("Error", "Unable to resend OTP. Please try signing in again.");
      }
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
          title={loading ? "Verifying..." : "Verify OTP"}
          onPress={handleVerifyOTP}
          disabled={!otpCode || otpCode.length !== 6}
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
      <Text style={styles.title}>Sign in</Text>
      
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      
      {usePassword && (
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
      )}

      <TouchableOpacity
        onPress={() => setUsePassword(!usePassword)}
        style={styles.toggleButton}
      >
        <Text style={styles.toggleText}>
          {usePassword ? "Use Email OTP instead" : "Use Password instead"}
        </Text>
      </TouchableOpacity>

      <Button
        title={loading ? "Signing in..." : usePassword ? "Sign in" : "Send OTP"}
        onPress={handleSignIn}
        disabled={!email}
      />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <GoogleAuth />

      <View style={styles.footer}>
        <Button
          title="Sign in with phone"
          onPress={() => router.replace("./phone")}
        />
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
  toggleButton: {
    marginBottom: 15,
    padding: 10,
  },
  toggleText: {
    color: "#007AFF",
    textAlign: "center",
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
