// Authentication utilities
const auth = {
  // Helper function to generate dummy email from username
  generateDummyEmail(username) {
    return `${username}@bundlerecommender.local`;
  },

  // Helper function to validate username
  validateUsername(username) {
    if (username.length < 3 || username.length > 20) {
      return { valid: false, error: 'Username must be between 3 and 20 characters' };
    }
    
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
    }
    
    return { valid: true };
  },

  // Sign up with username, password, and name
  async signUp(username, password, name) {
    try {
      // Validate username
      const validation = this.validateUsername(username);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const email = this.generateDummyEmail(username);
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { 
            username,
            name 
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered') || 
            error.message.includes('User already registered') ||
            error.message.includes('duplicate')) {
          return { success: false, error: 'This username is already taken. Please choose another one.' };
        }
        return { success: false, error: error.message };
      }

      // Check if user was created but identities is empty (duplicate)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return { success: false, error: 'This username is already taken. Please choose another one.' };
      }

      // Store user info in localStorage
      if (data.user) {
        localStorage.setItem('username', username);
        localStorage.setItem('displayName', name || username);
        localStorage.setItem('joinDate', data.user.created_at || new Date().toISOString());
      }

      return { success: true, data };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  },

  // Sign in with username and password
  async signIn(username, password) {
    try {
      // Validate username
      const validation = this.validateUsername(username);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const email = this.generateDummyEmail(username);
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid username or password' };
        }
        return { success: false, error: error.message };
      }

      // Store user info in localStorage
      if (data.user) {
        const storedUsername = data.user.user_metadata?.username || username;
        localStorage.setItem('username', storedUsername);
        localStorage.setItem('displayName', data.user.user_metadata?.name || storedUsername);
        localStorage.setItem('joinDate', data.user.created_at || new Date().toISOString());
      }

      return { success: true, data };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  },

  // Sign out
  async signOut() {
    try {
      // Clear localStorage
      localStorage.removeItem('username');
      localStorage.removeItem('displayName');
      localStorage.removeItem('joinDate');

      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      window.location.href = 'index.html';
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  },

// Get current user
async getCurrentUser() {
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error) throw error;
    if (!user) return null;

    const username = user.user_metadata?.username || '';
    const name = user.user_metadata?.name || username;

    // Store user info locally
    localStorage.setItem('username', username);
    localStorage.setItem('displayName', name);
    localStorage.setItem('joinDate', user.created_at || new Date().toISOString());

    // Return all useful fields
    return {
      id: user.id,
      username,
      name,
      email: user.email,
      created_at: user.created_at,
      user_metadata: user.user_metadata
    };
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
},

  // Get username from user metadata
  getUsername(user) {
    return user?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
  },

  // Check if user is authenticated
  async checkAuth() {
    const user = await this.getCurrentUser();
    if (!user && !window.location.pathname.endsWith('index.html')) {
      window.location.href = 'index.html';
      return false;
    }
    return !!user;
  }
};

window.auth = auth;