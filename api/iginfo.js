// api/iginfo.js
export default async function handler(req, res) {
  // Set JSON content type
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Developer info - exactly as asked
  const developerInfo = {
    developer: "WASIF ALI",
    telegram: "@FREEHACKS95",
    channel: "@THE_FREE_HACKS"
  };
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // GET request - single user
  if (req.method === 'GET') {
    const { username } = req.query;
    
    // No username provided
    if (!username || username.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Username parameter is required",
        message: "Please provide an Instagram username",
        example: "/api/iginfo?username=cristiano",
        developer: developerInfo
      });
    }
    
    // Invalid username format
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        error: "Invalid username format",
        message: "Username can only contain letters, numbers, dots and underscores",
        provided: username,
        developer: developerInfo
      });
    }
    
    // Username too long
    if (username.length > 30) {
      return res.status(400).json({
        success: false,
        error: "Username too long",
        message: "Maximum 30 characters allowed",
        provided_length: username.length,
        developer: developerInfo
      });
    }
    
    try {
      const data = await getInstagramData(username);
      
      // User not found
      if (!data || !data.username) {
        return res.status(404).json({
          success: false,
          error: "User not found",
          message: "No Instagram account found with this username",
          username: username,
          developer: developerInfo
        });
      }
      
      // Success response
      return res.status(200).json({
        success: true,
        data: data,
        developer: developerInfo
      });
      
    } catch (error) {
      // Service error
      return res.status(503).json({
        success: false,
        error: "Service temporarily unavailable",
        message: "Unable to fetch Instagram data. Please try again later.",
        developer: developerInfo
      });
    }
  }
  
  // POST request - bulk users
  if (req.method === 'POST') {
    let body;
    try {
      body = req.body;
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: "Invalid JSON",
        message: "Request body must be valid JSON",
        developer: developerInfo
      });
    }
    
    const { usernames } = body;
    
    // No usernames provided
    if (!usernames) {
      return res.status(400).json({
        success: false,
        error: "Missing usernames field",
        message: "Please provide an array of usernames",
        example: { usernames: ["cristiano", "leomessi"] },
        developer: developerInfo
      });
    }
    
    // Invalid format
    if (!Array.isArray(usernames)) {
      return res.status(400).json({
        success: false,
        error: "Invalid data type",
        message: "usernames must be an array",
        developer: developerInfo
      });
    }
    
    // Empty array
    if (usernames.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Empty array",
        message: "Please provide at least one username",
        developer: developerInfo
      });
    }
    
    // Too many usernames
    if (usernames.length > 10) {
      return res.status(400).json({
        success: false,
        error: "Too many usernames",
        message: "Maximum 10 usernames per request",
        max_allowed: 10,
        developer: developerInfo
      });
    }
    
    const results = {};
    const failed = {};
    
    for (const username of usernames) {
      if (!username || typeof username !== 'string') {
        failed[username || 'invalid'] = "Invalid username format";
        continue;
      }
      
      try {
        const data = await getInstagramData(username);
        if (data && data.username) {
          results[username] = data;
        } else {
          failed[username] = "User not found";
        }
      } catch (error) {
        failed[username] = "Failed to fetch data";
      }
    }
    
    return res.status(200).json({
      success: true,
      total: usernames.length,
      successful: Object.keys(results).length,
      failed_count: Object.keys(failed).length,
      results: results,
      errors: failed,
      developer: developerInfo
    });
  }
  
  // Method not allowed
  return res.status(405).json({
    success: false,
    error: "Method not allowed",
    message: `Method ${req.method} is not supported`,
    allowed_methods: ["GET", "POST", "OPTIONS"],
    developer: developerInfo
  });
}

async function getInstagramData(username) {
  let firstResponse = null;
  let secondResponse = null;
  
  // Try first API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(
      `https://insta-fastdevapis.ek4nsh.in/api/info?username=${username}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      firstResponse = await response.json();
    }
  } catch (error) {
    // First API failed
  }
  
  // Try second API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(
      `https://api.fastdevelopers.in/iginfo?username=${username}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      secondResponse = await response.json();
    }
  } catch (error) {
    // Second API failed
  }
  
  // Merge data from both APIs
  let mergedData = {
    username: null,
    full_name: null,
    bio: null,
    followers: null,
    following: null,
    posts: null,
    profile_picture: null,
    is_private: null,
    is_verified: null,
    user_id: null,
    recent_posts: []
  };
  
  // Get data from first response
  if (firstResponse) {
    mergedData.username = firstResponse.username || mergedData.username;
    mergedData.full_name = firstResponse.full_name || mergedData.full_name;
    mergedData.bio = firstResponse.bio || mergedData.bio;
    mergedData.followers = firstResponse.followers || mergedData.followers;
    mergedData.following = firstResponse.following || mergedData.following;
    mergedData.profile_picture = firstResponse.profile_image || mergedData.profile_picture;
    mergedData.is_private = firstResponse.is_private !== undefined ? firstResponse.is_private : mergedData.is_private;
    mergedData.is_verified = firstResponse.is_verified !== undefined ? firstResponse.is_verified : mergedData.is_verified;
    mergedData.user_id = firstResponse.id || mergedData.user_id;
  }
  
  // Get additional data from second response
  if (secondResponse) {
    mergedData.username = secondResponse.username || mergedData.username;
    mergedData.full_name = secondResponse.name || mergedData.full_name;
    mergedData.bio = secondResponse.bio || mergedData.bio;
    mergedData.followers = secondResponse.followers || mergedData.followers;
    mergedData.following = secondResponse.following || mergedData.following;
    mergedData.posts = secondResponse.posts || mergedData.posts;
    mergedData.profile_picture = secondResponse.pic || mergedData.profile_picture;
    mergedData.is_private = secondResponse.private !== undefined ? secondResponse.private : mergedData.is_private;
    mergedData.is_verified = secondResponse.verified !== undefined ? secondResponse.verified : mergedData.is_verified;
    mergedData.user_id = secondResponse.id || mergedData.user_id;
    
    // Get recent posts
    if (secondResponse.recent && Array.isArray(secondResponse.recent)) {
      mergedData.recent_posts = secondResponse.recent.map(post => ({
        id: post.id,
        code: post.code,
        image_url: post.img,
        caption: post.cap || "",
        shortcode: post.code
      }));
    }
  }
  
  // If no data found
  if (!mergedData.username) {
    return null;
  }
  
  // Format numbers
  const formatNumber = (num) => {
    if (!num) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };
  
  // Return clean data
  return {
    username: mergedData.username,
    full_name: mergedData.full_name || mergedData.username,
    bio: mergedData.bio || "",
    followers: mergedData.followers || 0,
    following: mergedData.following || 0,
    posts: mergedData.posts || 0,
    profile_picture: mergedData.profile_picture || "",
    is_private: mergedData.is_private || false,
    is_verified: mergedData.is_verified || false,
    user_id: mergedData.user_id || "",
    recent_posts: mergedData.recent_posts.slice(0, 12),
    stats: {
      followers_count: mergedData.followers || 0,
      following_count: mergedData.following || 0,
      posts_count: mergedData.posts || 0,
      followers_formatted: formatNumber(mergedData.followers),
      following_formatted: formatNumber(mergedData.following),
      posts_formatted: formatNumber(mergedData.posts)
    }
  };
}
