import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOidc } from "@axa-fr/react-oidc";

export function AuthCallback() {
  const navigate = useNavigate();
  const { isAuthenticated } = useOidc();

  useEffect(() => {
    if (isAuthenticated) {
      // User is authenticated, redirect to home
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
