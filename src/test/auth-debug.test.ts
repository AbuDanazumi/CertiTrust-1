import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  validateLoginCredentials,
  createAuthAccount,
  checkOnboardingStatus,
} from "@/hooks/useAuthValidation";

// Helper to create mocked chain for supabase queries: select -> eq -> maybeSingle
const mockChain = (data: any, error: any = null) => {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  return { select, eq, maybeSingle };
};

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      auth: {
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        getSession: vi.fn(),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    },
  };
});

describe("Authentication & Onboarding Pipeline", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should successfully authenticate and log in for valid university account", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: { user: { id: "test-user-id", email: "staff@univ.edu" } } },
      error: null,
    } as any);

    // Mock profiles table
    const profileMock = mockChain({
      account_type: "institution",
      institution_id: "test-inst-id",
      organization_id: null,
      display_name: "Univ Admin",
      organization_name: null,
      is_active: true,
    });

    // Mock institutions table
    const instMock = mockChain({
      is_active: true,
      status: "active",
    });

    // Mock user_roles table
    const rolesMock = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ role: "staff" }],
          error: null,
        }),
      }),
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "profiles") return profileMock as any;
      if (table === "institutions") return instMock as any;
      if (table === "user_roles") return rolesMock as any;
      return null as any;
    });

    const result = await validateLoginCredentials("staff@univ.edu", "Password123!", "institution");
    expect(result.success).toBe(true);
    expect(result.role).toBe("staff");
  });

  it("should block sign in with wrong password", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    } as any);

    const result = await validateLoginCredentials("staff@univ.edu", "wrongpass", "institution");
    expect(result.success).toBe(false);
    expect(result.message).toBe("Incorrect email or password.");
  });

  it("should block sign in with wrong portal select", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: { user: { id: "test-user-id" } } },
      error: null,
    } as any);

    const profileMock = mockChain({
      account_type: "organization",
      institution_id: null,
      organization_id: "test-org-id",
      display_name: "Org User",
      is_active: true,
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "profiles") return profileMock as any;
      return null as any;
    });

    const result = await validateLoginCredentials("user@company.com", "Password123!", "institution");
    expect(result.success).toBe(false);
    expect(result.message).toBe("This account belongs to another portal. Please choose the correct account type.");
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("should block suspended profile", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: { user: { id: "test-user-id" } } },
      error: null,
    } as any);

    const profileMock = mockChain({
      account_type: "institution",
      institution_id: "test-inst-id",
      is_active: false, // Suspended!
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "profiles") return profileMock as any;
      return null as any;
    });

    const result = await validateLoginCredentials("suspended@univ.edu", "Password123!", "institution");
    expect(result.success).toBe(false);
    expect(result.message).toBe("Your account has been suspended. Please contact support.");
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("should block suspended institution", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: { user: { id: "test-user-id" } } },
      error: null,
    } as any);

    const profileMock = mockChain({
      account_type: "institution",
      institution_id: "suspended-inst-id",
      is_active: true,
    });

    const instMock = mockChain({
      is_active: false,
      status: "suspended",
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "profiles") return profileMock as any;
      if (table === "institutions") return instMock as any;
      return null as any;
    });

    const result = await validateLoginCredentials("admin@suspended.edu", "Password123!", "institution");
    expect(result.success).toBe(false);
    expect(result.message).toBe("Your account has been suspended. Please contact support.");
  });

  it("should handle pending email verification from GoTrue error", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null },
      error: { message: "Email not confirmed" },
    } as any);

    const result = await validateLoginCredentials("unverified@univ.edu", "Password123!", "institution");
    expect(result.success).toBe(false);
    expect(result.message).toBe("Please verify your email before signing in.");
  });

  it("should identify missing role or incomplete setup", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: { user: { id: "test-user-id" } } },
      error: null,
    } as any);

    const profileMock = mockChain({
      account_type: "institution",
      institution_id: "test-inst-id",
      is_active: true,
    });

    const instMock = mockChain({
      is_active: true,
      status: "active",
    });

    const rolesMock = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [], // Empty role
          error: null,
        }),
      }),
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "profiles") return profileMock as any;
      if (table === "institutions") return instMock as any;
      if (table === "user_roles") return rolesMock as any;
      return null as any;
    });

    const result = await validateLoginCredentials("admin@univ.edu", "Password123!", "institution");
    expect(result.success).toBe(false);
    expect(result.message).toBe("Your account setup is incomplete.");
  });

  it("should check onboarding status helper correctly", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: { exists: true, incomplete: true, account_type: "organization" },
      error: null,
    } as any);

    const status = await checkOnboardingStatus("repair@company.com");
    expect(status.exists).toBe(true);
    expect(status.incomplete).toBe(true);
    expect(status.account_type).toBe("organization");
    expect(supabase.rpc).toHaveBeenCalledWith("check_onboarding_status", {
      _email: "repair@company.com",
    });
  });

  it("should fail signup duplicate email", async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    } as any);

    const result = await createAuthAccount({
      email: "duplicate@univ.edu",
      password: "Password123!",
      displayName: "Duplicate Univ",
      accountType: "institution",
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe("This email is already registered.");
  });
});
