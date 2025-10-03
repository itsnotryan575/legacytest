import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';
import { ArmiList } from '@/types/armi-intents';

// RevenueCat Configuration
const REVENUECAT_IOS_PUBLIC_KEY = 'appl_hojAymPIuDWMsoZMLmFuRwkgakC';
const REVENUECAT_ANDROID_PUBLIC_KEY = 'goog_YOUR_ANDROID_KEY_HERE'; // ← replace with your real key
const ENTITLEMENT_ID = 'ARMi Pro';
const OFFERING_ID = 'default';

interface ProStatus {
  isPro: boolean;
  selectedListType: ArmiList | null;
  isProForLife: boolean;
  hasRevenueCatEntitlement: boolean;
}

class AuthServiceClass {
  private supabase: any = null;
  private isInitialized = false;
  private revenueCatInitialized = false;

  // --------- INIT ---------
  async init() {
    if (this.isInitialized) return;

    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase environment variables not found');
      }

      this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      });

      this.isInitialized = true;
      console.log('Auth service initialized successfully');

      await this.initRevenueCat();
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
      throw error;
    }
  }

  private async initRevenueCat() {
    try {
      const apiKey =
        Platform.OS === 'ios' ? REVENUECAT_IOS_PUBLIC_KEY : REVENUECAT_ANDROID_PUBLIC_KEY;

      await Purchases.configure({
        apiKey,
        appUserID: undefined, // Will be set when user signs in
      });

      // Debug logging (not async)
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);

      this.revenueCatInitialized = true;
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      // Don't throw — app still works without RevenueCat
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  // --------- AUTH ---------
  async signUp(email: string, password: string) {
    await this.ensureInitialized();

    const { data, error } = await this.supabase.auth.signUp({ email, password });

    if (error) {
      console.error('Signup error:', error);
      throw new Error(error.message);
    }

    console.log('Signup result:', {
      user: data.user ? { id: data.user.id, email: data.user.email, confirmed: data.user.email_confirmed_at } : null,
      session: data.session ? 'exists' : 'null',
    });

    return data;
  }

  async signIn(email: string, password: string) {
    await this.ensureInitialized();

    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    if (data.user?.id) {
      await this.setRevenueCatUserId(data.user.id);
    }

    return data;
  }

  async signOut() {
    await this.ensureInitialized();

    try {
      if (this.revenueCatInitialized) {
        // small delay helps on some devices
        await new Promise((r) => setTimeout(r, 100));
        await Purchases.logOut();
      }
    } catch (error) {
      console.error('Failed to log out from RevenueCat:', error);
    }

    const { error } = await this.supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async sendEmailOtp(email: string) {
    await this.ensureInitialized();
    const { data, error } = await this.supabase.auth.resend({ type: 'signup', email });
    if (error) throw new Error(error.message);
    return data;
  }

  async verifyEmailOtp(email: string, token: string) {
    await this.ensureInitialized();

    const { data, error } = await this.supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if (error) throw new Error(error.message);

    const session = await this.getSession();
    if (session?.user?.id) await this.setRevenueCatUserId(session.user.id);

    return data;
  }

  async resetPassword(email: string) {
    await this.ensureInitialized();
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
  }

  async updatePassword(newPassword: string) {
    await this.ensureInitialized();
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }

  async updateEmail(newEmail: string) {
    await this.ensureInitialized();
    const { error } = await this.supabase.auth.updateUser({ email: newEmail });
    if (error) throw new Error(error.message);
  }

  async getCurrentUser() {
    await this.ensureInitialized();
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  async getSession() {
    await this.ensureInitialized();
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!this.supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return this.supabase.auth.onAuthStateChange(callback);
  }

  // --------- REVENUECAT ---------
  async setRevenueCatUserId(userId: string) {
    try {
      if (this.revenueCatInitialized) {
        await Purchases.logIn(userId);
        console.log('RevenueCat user ID set:', userId);
      }
    } catch (error) {
      console.error('Failed to set RevenueCat user ID:', error);
    }
  }

  async getOfferings(): Promise<PurchasesOffering[]> {
    await this.ensureInitialized();
    if (!this.revenueCatInitialized) throw new Error('RevenueCat not initialized');

    try {
      const offerings = await Purchases.getOfferings();
      return offerings.all[OFFERING_ID]?.availablePackages || [];
    } catch (error) {
      console.error('Error fetching offerings:', error);
      throw error;
    }
  }

  async purchasePackage(packageToPurchase: any) {
    await this.ensureInitialized();
    if (!this.revenueCatInitialized) throw new Error('RevenueCat not initialized');

    try {
      const session = await this.getSession();
      if (session?.user?.id) await this.setRevenueCatUserId(session.user.id);

      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      console.log('Purchase successful! Customer info:', {
        originalAppUserId: customerInfo.originalAppUserId,
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
        allEntitlements: Object.keys(customerInfo.entitlements.all),
      });
      return customerInfo;
    } catch (error) {
      console.error('Error purchasing package:', error);
      throw error;
    }
  }

  async restorePurchases() {
    await this.ensureInitialized();
    if (!this.revenueCatInitialized) throw new Error('RevenueCat not initialized');

    try {
      const session = await this.getSession();
      if (session?.user?.id) await this.setRevenueCatUserId(session.user.id);

      const customerInfo = await Purchases.restorePurchases();
      console.log('Restore successful! Customer info:', {
        originalAppUserId: customerInfo.originalAppUserId,
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
        allEntitlements: Object.keys(customerInfo.entitlements.all),
      });
      return customerInfo;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      throw error;
    }
  }

  // --------- USER PROFILE HELPERS ---------
  async ensureUserProfileExists(userId: string) {
    await this.ensureInitialized();

    try {
      const { data: existingProfile, error: selectError } = await this.supabase
        .from('user_profiles')
        .select('id, is_pro_for_life, selected_list_type')
        .eq('user_id', userId)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking existing user profile:', selectError);
        return null;
      }

      if (existingProfile) return existingProfile;

      const now = new Date().toISOString();
      const { data: newProfile, error: insertError } = await this.supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          is_pro_for_life: false,
          selected_list_type: null,
          created_at: now,
          updated_at: now,
        })
        .select('id, is_pro_for_life, selected_list_type')
        .single();

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return null;
      }

      return newProfile;
    } catch (error) {
      console.error('Error ensuring user profile exists:', error);
      return null;
    }
  }

  async checkProStatus(forceRefresh: boolean = false): Promise<ProStatus> {
    await this.ensureInitialized();

    const defaultStatus: ProStatus = {
      isPro: false,
      selectedListType: null,
      isProForLife: false,
      hasRevenueCatEntitlement: false,
    };

    try {
      const session = await this.getSession();
      if (!session?.user?.id) return defaultStatus;

      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('is_pro_for_life, selected_list_type')
        .eq('user_id', session.user.id)
        .single();

      const isProForLife = userProfile?.is_pro_for_life || false;
      const selectedListType = userProfile?.selected_list_type || null;

      let hasRevenueCatEntitlement = false;
      if (this.revenueCatInitialized) {
        try {
          await Purchases.invalidateCustomerInfoCache();
          const customerInfo = await Purchases.getCustomerInfo();

          console.log('RevenueCat Customer Info:', {
            originalAppUserId: customerInfo.originalAppUserId,
            activeEntitlements: Object.keys(customerInfo.entitlements.active),
            allEntitlements: Object.keys(customerInfo.entitlements.all),
            entitlementId: ENTITLEMENT_ID,
          });

          const possibleEntitlementIds = [ENTITLEMENT_ID, 'ARMi_Pro', 'armi_pro', 'pro', 'Pro'];
          hasRevenueCatEntitlement = possibleEntitlementIds.some(
            (id) => customerInfo.entitlements.active[id] !== undefined
          );
        } catch (revenueCatError) {
          console.error('Failed to check RevenueCat entitlement:', revenueCatError);
        }
      }

      const isPro = isProForLife || hasRevenueCatEntitlement;

      return { isPro, selectedListType, isProForLife, hasRevenueCatEntitlement };
    } catch (error) {
      console.error('Error checking pro status:', error);
      return defaultStatus;
    }
  }

  async updateSelectedListType(listType: ArmiList) {
    await this.ensureInitialized();

    try {
      const session = await this.getSession();
      if (!session?.user?.id) throw new Error('No authenticated user');

      const { data: existingProfile, error: selectError } = await this.supabase
        .from('user_profiles')
        .select('id, selected_list_type')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking existing profile:', selectError);
        throw new Error(selectError.message);
      }

      const now = new Date().toISOString();

      if (existingProfile) {
        const { error: updateError } = await this.supabase
          .from('user_profiles')
          .update({ selected_list_type: listType, updated_at: now })
          .eq('user_id', session.user.id);

        if (updateError) throw new Error(updateError.message);
      } else {
        const { error: insertError } = await this.supabase
          .from('user_profiles')
          .insert({ user_id: session.user.id, selected_list_type: listType, created_at: now, updated_at: now });

        if (insertError) throw new Error(insertError.message);
      }
    } catch (error) {
      console.error('Error updating selected list type:', error);
      throw error;
    }
  }

  // --------- DELETE ACCOUNT (Edge Function) ---------
  async deleteAccount() {
    await this.ensureInitialized();

    try {
      console.log('Invoking delete-auth-user…');
      const { data: fnData, error: fnError } = await this.supabase.functions.invoke('delete-auth-user', {
        // function reads the current JWT; no body required
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        throw new Error(fnError.message || 'delete-auth-user failed');
      }
      if (typeof fnData === 'string' && fnData !== 'ok') {
        console.error('Edge function returned non-ok body:', fnData);
        throw new Error(String(fnData));
      }

      try {
        if (this.revenueCatInitialized) {
          await Purchases.logOut();
          await Purchases.invalidateCustomerInfoCache();
        }
      } catch (rcErr) {
        console.error('RevenueCat cleanup error:', rcErr);
      }

      await this.signOut();
      console.log('Account deletion flow complete');
    } catch (error) {
      console.error('Error during account deletion:', error);
      throw error;
    }
  }
}

export const AuthService = new AuthServiceClass();