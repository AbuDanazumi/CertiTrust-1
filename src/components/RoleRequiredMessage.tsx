import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface RoleRequiredMessageProps {
  expectedRole: "staff" | "organization" | "super_admin";
  userRole?: string;
}

export function RoleRequiredMessage({ expectedRole, userRole }: RoleRequiredMessageProps) {
  const navigate = useNavigate();

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "staff":
        return "University/Institution Staff";
      case "organization":
        return "Organization Member";
      case "super_admin":
        return "Super Admin";
      default:
        return "User";
    }
  };

  const getPortalUrl = (role: string) => {
    switch (role) {
      case "staff":
        return "/institution";
      case "organization":
        return "/organization";
      case "super_admin":
        return "/super-admin";
      default:
        return "/";
    }
  };

  const loginPath =
    expectedRole === "organization"
      ? "/login/organization"
      : expectedRole === "staff"
        ? "/login/institution"
        : expectedRole === "super_admin"
          ? "/super-admin/login"
          : "/login/institution";

  const handleLogout = () => {
    localStorage.removeItem("auth_session");
    navigate(loginPath);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md p-8 shadow-lg border-red-200 dark:border-red-800">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-100 dark:bg-red-950 rounded-full">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center mb-2 text-red-900 dark:text-red-100">
          Access Denied
        </h1>

        {/* Message */}
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-900 dark:text-red-100 text-sm leading-relaxed">
            Your account is configured for <strong>{getRoleDisplay(expectedRole)}</strong> access.
            {userRole && userRole !== expectedRole && (
              <>
                {" "}
                However, you are currently logged in as a{" "}
                <strong>{getRoleDisplay(userRole)}</strong>.
              </>
            )}
          </p>
        </div>

        {/* Instructions */}
        <div className="space-y-3 mb-6">
          <div className="flex gap-3">
            <span className="text-lg font-bold text-slate-400 dark:text-slate-600 flex-shrink-0">
              1
            </span>
            <p className="text-sm text-muted-foreground">
              If you have multiple accounts, sign out and sign in with your{" "}
              {getRoleDisplay(expectedRole).toLowerCase()} account.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-lg font-bold text-slate-400 dark:text-slate-600 flex-shrink-0">
              2
            </span>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact support.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-lg font-bold text-slate-400 dark:text-slate-600 flex-shrink-0">
              3
            </span>
            <p className="text-sm text-muted-foreground">
              Make sure to select the correct account type when signing in.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleLogout}
            variant="default"
            className="w-full h-11"
          >
            Sign Out & Try Again
          </Button>

          <Button
            onClick={() => navigate(getPortalUrl(expectedRole))}
            variant="outline"
            className="w-full h-11"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to {getRoleDisplay(expectedRole)} Portal
          </Button>

          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="w-full h-11"
          >
            Return to Home
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-2">
            Need Help?
          </h3>
          <p className="text-xs text-blue-800 dark:text-blue-200">
            Contact our support team if you believe this is an error or if you need to change your account type.
          </p>
        </div>
      </Card>
    </div>
  );
}
