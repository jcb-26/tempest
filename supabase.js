const SUPABASE_URL = 'https://aryhsewwawpebxgabfba.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_zJAordcFXztIPvJxVD9iDA_KD3LYzBs';

const tempestDb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
window.tempestDb = tempestDb;

async function getCurrentUser() {
    const { data, error } = await tempestDb.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
}

async function getCurrentProfile() {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await tempestDb
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Failed to load profile:', error);
        return null;
    }
    return data;
}

async function signInWithEmail(email, password) {
    return await tempestDb.auth.signInWithPassword({ email, password });
}

async function registerNewUser(email, password, username) {
    return await tempestDb.auth.signUp({
        email,
        password,
        options: { data: { username: username } }
    });
}

async function signOutUser() {
    return await tempestDb.auth.signOut();
}

async function sendPasswordResetEmail(email) {
    const redirectUrl = window.location.origin + '/reset-password.html';
    return await tempestDb.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
    });
}

async function updateUserPassword(newPassword) {
    return await tempestDb.auth.updateUser({ password: newPassword });
}

async function fetchAvailableItems() {
    const { data, error } = await tempestDb
        .from('items')
        .select('*')
        .eq('is_for_sale', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Failed to load items:', error);
        return [];
    }
    return data;
}

async function fetchItemById(itemId) {
    const { data, error } = await tempestDb
        .from('items')
        .select('*')
        .eq('id', itemId)
        .single();

    if (error) {
        console.error('Failed to load item:', error);
        return null;
    }
    return data;
}

async function fetchMyItems() {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await tempestDb
        .from('items')
        .select('*')
        .eq('owner_id', user.id)
        .order('name', { ascending: true });

    if (error) {
        console.error('Failed to load owned items:', error);
        return [];
    }
    return data;
}

async function fetchMyTransactions() {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await tempestDb
        .from('transactions')
        .select('*')
        .eq('buyer_id', user.id)
        .order('purchased_at', { ascending: false });

    if (error) {
        console.error('Failed to load transaction history:', error);
        return [];
    }
    return data;
}

async function fetchDailyDeals() {
    const { data, error } = await tempestDb.rpc('daily_deals');
    if (error) {
        console.error('Failed to load daily deals:', error);
        return [];
    }
    return data || [];
}

async function fetchDailyDealIds() {
    const deals = await fetchDailyDeals();
    return new Set(deals.map(d => d.id));
}


async function fetchDailyRewardStatus() {
    const { data, error } = await tempestDb.rpc('daily_reward_status');
    if (error) {
        console.error('Failed to load reward status:', error);
        return null;
    }
    return data;
}

async function claimDailyReward() {
    const { data, error } = await tempestDb.rpc('claim_daily_reward');
    if (error) return { success: false, error: error.message };
    return data;
}


async function fetchRecentTransactions(limit = 50) {
    const { data, error } = await tempestDb.rpc('recent_transactions', {
        limit_param: limit
    });
    if (error) {
        console.error('Failed to load recent transactions:', error);
        return [];
    }
    return data || [];
}

async function fetchTopSquallers(limit = 100) {
    const { data, error } = await tempestDb.rpc('top_squallers', {
        limit_param: limit
    });
    if (error) {
        console.error('Failed to load top squallers:', error);
        return [];
    }
    return data || [];
}


async function fetchUserProfile(username) {
    const { data, error } = await tempestDb.rpc('user_profile_view', {
        username_param: username
    });
    if (error) {
        console.error('Failed to load profile:', error);
        return null;
    }
    if (!data || data.length === 0) return null;
    return data[0];
}

async function fetchUserItems(username) {
    const { data, error } = await tempestDb.rpc('user_items', {
        username_param: username
    });
    if (error) {
        console.error('Failed to load user items:', error);
        return [];
    }
    return data || [];
}

async function followUser(username) {
    const { data, error } = await tempestDb.rpc('follow_user', {
        target_username: username
    });
    if (error) return { success: false, error: error.message };
    return data;
}

async function unfollowUser(username) {
    const { data, error } = await tempestDb.rpc('unfollow_user', {
        target_username: username
    });
    if (error) return { success: false, error: error.message };
    return data;
}

async function addToCart(itemId) {
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: 'You must be signed in to add to cart.' };
    }

    const { error } = await tempestDb
        .from('cart_items')
        .insert({ user_id: user.id, item_id: itemId });

    if (error) {
        if (error.code === '23505') {
            return { success: false, error: 'This item is already in your cart.' };
        }
        return { success: false, error: error.message };
    }

    return { success: true };
}

async function removeFromCart(itemId) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Not signed in.' };

    const { error } = await tempestDb
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

async function fetchCart() {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await tempestDb
        .from('cart_items')
        .select(`
            id,
            added_at,
            item:items (
                id,
                name,
                description,
                price,
                image_url,
                is_for_sale
            )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

    if (error) {
        console.error('Failed to load cart:', error);
        return [];
    }
    return data;
}

async function fetchCartCount() {
    const user = await getCurrentUser();
    if (!user) return 0;

    const { count, error } = await tempestDb
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

    if (error) return 0;
    return count || 0;
}

async function purchaseItem(itemId) {
    const { data, error } = await tempestDb.rpc('purchase_item', {
        item_id_param: itemId
    });
    if (error) return { success: false, error: error.message };
    return data;
}

async function relistItem(itemId, newPrice) {
    const { data, error } = await tempestDb.rpc('relist_item', {
        item_id_param: itemId,
        new_price_param: newPrice
    });
    if (error) return { success: false, error: error.message };
    return data;
}

async function delistItem(itemId) {
    const { data, error } = await tempestDb.rpc('delist_item', {
        item_id_param: itemId
    });
    if (error) return { success: false, error: error.message };
    return data;
}

window.tempest = {
    getCurrentUser,
    getCurrentProfile,
    signInWithEmail,
    registerNewUser,
    signOutUser,
    sendPasswordResetEmail,
    updateUserPassword,
    fetchAvailableItems,
    fetchItemById,
    fetchMyItems,
    fetchMyTransactions,
    fetchDailyDeals,
    fetchDailyDealIds,
    fetchDailyRewardStatus,
    claimDailyReward,
    fetchRecentTransactions,
    fetchTopSquallers,
    fetchUserProfile,
    fetchUserItems,
    followUser,
    unfollowUser,
    addToCart,
    removeFromCart,
    fetchCart,
    fetchCartCount,
    purchaseItem,
    relistItem,
    delistItem
};
