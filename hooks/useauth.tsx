import { useAuth as useClerkAuth } from "@clerk/clerk-expo";

export default function useAuth() {
  const { isSignedIn, userId, user, isLoaded } = useClerkAuth();

  return { 
    user, 
    isLoading: !isLoaded,
    isSignedIn 
  };
}
