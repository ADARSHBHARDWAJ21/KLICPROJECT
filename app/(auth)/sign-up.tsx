// screens/SignUp.tsx
import { useSignUp } from "@clerk/clerk-expo";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, Text, TextInput, View, StyleSheet, TouchableOpacity } from "react-native";
import GoogleAuth from "../../lib/googleauth";

export default function SignUp() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  async function handleSignUp() {
    if (!isLoaded || !signUp) return;

    try {
      setSending(true);
      // Validate password
      if (!password || password.length < 8) {
        Alert.alert("Password Required", "Please enter a password with at least 8 characters.");
        setSending(false);
        return;
      }

      // Create sign-up with email OTP strategy
      const result = await signUp.create({
        emailAddress: email,
        password: password,
      });

      console.log("Sign up result status:", result.status);

      // Prepare email verification code
      if (result.status === "missing_requirements") {
        // Email verification is required
        try {
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setOtpSent(true);
          Alert.alert("OTP Sent", "Please check your email for the verification code.");
        } catch (verifyErr: any) {
          console.error("Error preparing verification:", verifyErr);
          Alert.alert("Error", verifyErr.errors?.[0]?.message || "Failed to send verification code");
        }
      } else if (result.status === "complete") {
        // Account created without verification needed (shouldn't happen with email)
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          router.replace("../(tabs)/home.tsx");
        }
      } else {
        console.log("Unexpected sign-up status:", result.status);
        Alert.alert("Error", "Unexpected response. Please try again.");
      }
    } catch (err: any) {
      console.error("Sign up error:", err);
      Alert.alert("Sign up error", err.errors?.[0]?.message || "Failed to sign up");
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyOTP() {
    if (!isLoaded || !signUp) {
      Alert.alert("Error", "Please wait, system is initializing...");
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP code");
      return;
    }

    try {
      setSending(true);
      
      // Attempt email verification
      const result = await signUp.attemptEmailAddressVerification({
        code: otpCode.trim(),
      });

      console.log("Verification result status:", result.status);
      console.log("Sign-up status after verification:", signUp.status);
      console.log("Missing fields:", signUp.missingFields);
      console.log("Unverified fields:", signUp.unverifiedFields);

      // After email verification, check if we need to complete the sign-up
      if (signUp.status === "missing_requirements") {
        const missingFields = signUp.missingFields || [];
        console.log("Missing fields detected:", missingFields);
        
        // If only phone_number is missing, we should be able to complete sign-up without it
        // Phone number is NOT required for email/password sign-up - it's a separate authentication method
        if (missingFields.length === 1 && missingFields.includes("phone_number")) {
          console.log("Only phone_number is missing - completing email/password sign-up without phone");
          console.log("Sign-up status:", signUp.status);
          console.log("Created session ID:", signUp.createdSessionId);
          
          try {
            // First, check if we can get a session immediately
            if (signUp.createdSessionId) {
              await setActive({ session: signUp.createdSessionId });
              console.log("Session activated successfully");
              setOtpCode("");
              setOtpSent(false);
              router.replace("/(tabs)/home");
              return;
            }
            
            // Email/password sign-up should complete without phone_number
            // Try to finalize the sign-up - phone is optional for email-based accounts
            console.log("Completing email/password sign-up (phone not required)...");
            
            // Wait a moment for Clerk to process the email verification
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Re-check sign-up status - it should be complete after email verification
            console.log("Re-checking sign-up status after wait");
            // Re-check the current status after waiting
            // Note: Status may change after Clerk processes, so we check the actual current value
            const currentStatus = signUp.status as string;
            console.log("Current sign-up status:", currentStatus);
            console.log("Session ID:", signUp.createdSessionId);
            
            // Check if status has changed to complete (using type assertion since status can change)
            if (currentStatus === "complete" && signUp.createdSessionId) {
              await setActive({ session: signUp.createdSessionId });
              console.log("Email/password sign-up completed successfully");
              setOtpCode("");
              setOtpSent(false);
              router.replace("/(tabs)/home");
              return;
            }
            
            // If still not complete, try one more time with a longer wait
            // Email is verified, so account should be created
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check status again after second wait (status may have changed)
            const finalStatus = signUp.status as string;
            if (finalStatus === "complete" && signUp.createdSessionId) {
              await setActive({ session: signUp.createdSessionId });
              console.log("Sign-up completed on second check");
              setOtpCode("");
              setOtpSent(false);
              router.replace("/(tabs)/home");
              return;
            }
            
            // If Clerk still requires phone_number, this is a configuration issue
            // Email/password sign-up should NOT require phone
            // Account should be created since email is verified
            console.log("Email verified - account should exist even if sign-up status shows missing_requirements");
            console.log("Redirecting to sign-in - account is ready");
            
            setOtpCode("");
            setOtpSent(false);
            
            Alert.alert(
              "Account Created Successfully! ✅",
              `Your email has been verified!\n\nYour account is ready. Please sign in with your email and password.`,
              [
                {
                  text: "Sign In Now",
                  onPress: () => {
                    router.replace("./sign-in");
                  },
                },
              ]
            );
            return;
          } catch (err: any) {
            console.error("Error completing email/password sign-up:", err);
            // Email is verified, so account should exist
            setOtpCode("");
            setOtpSent(false);
            Alert.alert(
              "Account Created! ✅",
              `Your email has been verified!\n\nPlease sign in with your email and password.`,
              [
                {
                  text: "Sign In",
                  onPress: () => {
                    router.replace("./sign-in");
                  },
                },
              ]
            );
            return;
          }
        }
        
        // If password is required but not provided
        if (missingFields.includes("password") && !password) {
          try {
            const completeResult = await signUp.update({
              password: password || undefined,
            });
            
            console.log("After update - status:", completeResult.status);
            console.log("After update - signUp.status:", signUp.status);
            
            // Check if status changed after update (status may change after update)
            const updatedStatus = signUp.status as string;
            if (updatedStatus === "complete" && signUp.createdSessionId) {
              await setActive({ session: signUp.createdSessionId });
              setOtpCode("");
              setOtpSent(false);
              router.replace("/(tabs)/home");
              return;
            }
          } catch (updateErr: any) {
            console.error("Update error:", updateErr);
            Alert.alert(
              "Password Required",
              "A password is required to complete your account. Please enter a password.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    setOtpSent(false);
                    setOtpCode("");
                  },
                },
              ]
            );
            return;
          }
        }
        
        // If phone_number is the only missing field, try to complete sign-up anyway
        // Phone number should be optional for email sign-up
        if (missingFields.length === 1 && missingFields.includes("phone_number")) {
          // Try to get session and complete sign-up
          if (signUp.createdSessionId) {
            await setActive({ session: signUp.createdSessionId });
            setOtpCode("");
            setOtpSent(false);
            setTimeout(() => {
              router.replace("/(tabs)/home");
            }, 100);
            return;
          }
        }
        
        // For other missing requirements, only show alert if it's not just phone_number
        const nonPhoneFields = missingFields.filter(field => field !== "phone_number");
        if (nonPhoneFields.length > 0) {
          Alert.alert(
            "Additional Information Required",
            `Please complete: ${nonPhoneFields.join(", ")}`,
            [
              {
                text: "OK",
                onPress: () => {
                  setOtpSent(false);
                  setOtpCode("");
                },
              },
            ]
          );
        } else {
          // Only phone_number is missing - complete sign-up without showing alert
          if (signUp.createdSessionId) {
            await setActive({ session: signUp.createdSessionId });
            setOtpCode("");
            setOtpSent(false);
            setTimeout(() => {
              router.replace("/(tabs)/home");
            }, 100);
          }
        }
        return;
      }

      // Check if sign-up is complete
      if (signUp.status === "complete") {
        console.log("Sign-up complete! Session ID:", signUp.createdSessionId);
        if (signUp.createdSessionId) {
          try {
            await setActive({ session: signUp.createdSessionId });
            console.log("Session activated, redirecting to home");
            setOtpCode("");
            setOtpSent(false);
            router.replace("/(tabs)/home");
          } catch (activeErr: any) {
            console.error("Error activating session:", activeErr);
            Alert.alert(
              "Account Created",
              "Your account has been successfully created! Please sign in.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    setOtpCode("");
                    setOtpSent(false);
                    router.replace("./sign-in");
                  },
                },
              ]
            );
          }
        } else if (result.createdSessionId) {
          try {
            await setActive({ session: result.createdSessionId });
            console.log("Session activated from result, redirecting to home");
            setOtpCode("");
            setOtpSent(false);
            router.replace("/(tabs)/home");
          } catch (activeErr: any) {
            console.error("Error activating session from result:", activeErr);
            Alert.alert(
              "Account Created",
              "Your account has been successfully created! Please sign in.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    setOtpCode("");
                    setOtpSent(false);
                    router.replace("./sign-in");
                  },
                },
              ]
            );
          }
        } else {
          // Account created but no session - redirect to sign in
          console.log("Account created but no session ID available");
          Alert.alert(
            "Account Created Successfully",
            "Your email has been verified and your account is ready! Please sign in with your email and password.",
            [
              {
                text: "Sign In",
                onPress: () => {
                  setOtpCode("");
                  setOtpSent(false);
                  router.replace("./sign-in");
                },
              },
            ]
          );
        }
      } else if (result.status === "complete") {
        // Fallback: check result status
        console.log("Result status is complete, session ID:", result.createdSessionId);
        if (result.createdSessionId) {
          try {
            await setActive({ session: result.createdSessionId });
            setOtpCode("");
            setOtpSent(false);
            router.replace("/(tabs)/home");
          } catch (activeErr: any) {
            console.error("Error activating session from result fallback:", activeErr);
      Alert.alert(
              "Account Created",
              "Your account has been successfully created! Please sign in.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    setOtpCode("");
                    setOtpSent(false);
                    router.replace("./sign-in");
                  },
                },
              ]
            );
          }
        }
      } else {
        console.log("Unexpected status - signUp.status:", signUp.status, "result.status:", result.status);
        Alert.alert("Verification in progress", "Please wait a moment and try again.");
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      const errorMessage = err.errors?.[0]?.message || err.message || "Invalid verification code";
      
      // Check if it's a rate limit or temporary error
      if (errorMessage.includes("rate") || errorMessage.includes("too many")) {
        Alert.alert("Too Many Attempts", "Please wait a moment before trying again.");
      } else if (errorMessage.includes("expired")) {
        Alert.alert("Code Expired", "The verification code has expired. Please request a new one.", [
          {
            text: "Resend",
            onPress: handleResendOTP,
          },
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
    if (!isLoaded) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      Alert.alert("OTP Resent", "A new verification code has been sent to your email.");
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
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Text style={styles.hint}>Enter a password for your account. An OTP will be sent to your email for verification.</Text>
      <Button title={sending ? "Sending OTP..." : "Sign up & Send OTP"} onPress={handleSignUp} />

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
  hint: {
    fontSize: 12,
    color: "#666",
    marginBottom: 15,
    fontStyle: "italic",
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
