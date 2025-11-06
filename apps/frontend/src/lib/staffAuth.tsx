import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";

type StaffAuthState = {
  isAuthenticated: boolean;
  username: string | null;
  adminKey: string | null;
};

type StaffAuthContextValue = StaffAuthState & {
  login: (input: { username: string; adminKey: string }) => void;
  logout: () => void;
};

const defaultState: StaffAuthState = {
  isAuthenticated: false,
  username: null,
  adminKey: null
};

const StaffAuthContext = createContext<StaffAuthContextValue | undefined>(
  undefined
);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StaffAuthState>(defaultState);

  const login = useCallback((input: { username: string; adminKey: string }) => {
    setState({
      isAuthenticated: true,
      username: input.username,
      adminKey: input.adminKey
    });
  }, []);

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
