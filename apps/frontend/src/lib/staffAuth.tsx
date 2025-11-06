import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";

export type StaffRole = "owner" | "moderator";

type StaffAuthState = {
  isAuthenticated: boolean;
  username: string | null;
  role: StaffRole | null;
  adminKey: string | null;
};

type StaffAuthContextValue = StaffAuthState & {
  login: (input: {
    username: string;
    adminKey: string | null;
    role: StaffRole;
  }) => void;
  logout: () => void;
};

const defaultState: StaffAuthState = {
  isAuthenticated: false,
  username: null,
  role: null,
  adminKey: null
};

const StaffAuthContext = createContext<StaffAuthContextValue | undefined>(
  undefined
);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StaffAuthState>(defaultState);

  const login = useCallback(
    (input: { username: string; adminKey: string | null; role: StaffRole }) => {
      setState({
        isAuthenticated: true,
        username: input.username,
        adminKey: input.adminKey,
        role: input.role
      });
    },
    []
  );

  const logout = useCallback(() => {
    setState(defaultState);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      login,
      logout
    }),
    [state, login, logout]
  );

  return (
    <StaffAuthContext.Provider value={value}>
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth(): StaffAuthContextValue {
  const value = useContext(StaffAuthContext);
  if (!value) {
    throw new Error("useStaffAuth must be used within StaffAuthProvider");
  }
  return value;
}
