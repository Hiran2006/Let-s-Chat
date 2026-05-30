import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { makeANetworkCall } from "../../network/network";
import { login } from "../../network/endpoint";

export interface AuthState {
  name: string;
  email: string;
  loading: boolean;
  error: string | null;
}

// Helper function to decode JWT client-side without external dependencies
function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Helper function to get a cookie value by name client-side
function getCookie(name: string): string | null {
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()!.split(';').shift() || null;
  } catch {
    return null;
  }
  return null;
}

const token = getCookie("authToken");
const decoded = token ? decodeJwt(token) : null;

const initialState: AuthState = {
  name: decoded?.name || "",
  email: decoded?.email || "",
  loading: false,
  error: null,
};

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (credentials: { email: string; password: any }, { rejectWithValue }) => {
    try {
      const response = await makeANetworkCall(login, "POST", credentials);
      // Response with AUTH token 
      // E.g., response.data.AUTH or response.data.token
      const token = response.data.infoToken
      const decoded = decodeJwt(token);
      if (!decoded) {
        return rejectWithValue("Failed to decode token");
      }
      
      const { email, name } = decoded;
      return { email: email || "", name: name || "" };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Login failed"
      );
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.name = "";
      state.email = "";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.name = action.payload.name;
        state.email = action.payload.email;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Something went wrong";
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
