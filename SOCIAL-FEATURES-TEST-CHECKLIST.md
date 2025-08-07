# 🧪 SOCIAL FEATURES TEST CHECKLIST

## 📋 Overview
This checklist verifies that likes, follows, saves, and comments are working correctly across the platform with real-time updates.

## ✅ COMPLETED FEATURES TO TEST

### 🔥 **LIKES SYSTEM**
- **API Endpoint**: `/api/likes` ✅ Implemented
- **Database Functions**: `increment_biglio_like_count`, `decrement_biglio_like_count` ✅ Created
- **Real-time Updates**: ✅ Integrated via `RealtimeContext`

**Test Cases:**
- [ ] Like a book on main feed - count should increase
- [ ] Unlike a book - count should decrease  
- [ ] Like state should persist across page refreshes
- [ ] Real-time updates when other users like/unlike
- [ ] Like button should be disabled for unauthenticated users
- [ ] Like count should display correctly

### 💾 **SAVES SYSTEM**
- **API Endpoint**: `/api/saves` ✅ Implemented
- **Database Functions**: `increment_biglio_save_count`, `decrement_biglio_save_count` ✅ Created
- **Real-time Updates**: ✅ Integrated via `RealtimeContext`

**Test Cases:**
- [ ] Save a book - count should increase and button should change state
- [ ] Unsave a book - count should decrease
- [ ] Save state should persist across sessions
- [ ] Real-time updates when other users save/unsave
- [ ] Save button should be disabled for unauthenticated users

### 👥 **FOLLOWS SYSTEM**
- **API Endpoint**: `/api/follows` ✅ Implemented
- **Database Functions**: `increment_channel_follower_count`, `decrement_channel_follower_count` ✅ Created
- **Real-time Updates**: ✅ Integrated via `RealtimeContext`

**Test Cases:**
- [ ] Follow a channel - follower count should increase
- [ ] Unfollow a channel - follower count should decrease
- [ ] Follow button should not appear on own channel
- [ ] Follow state should persist across sessions
- [ ] Real-time updates when other users follow/unfollow
- [ ] Follow button should be disabled for unauthenticated users

### 💬 **COMMENTS SYSTEM**
- **API Endpoint**: `/api/comments` ✅ Implemented
- **Database Functions**: `increment_biglio_comment_count`, `increment_comment_reply_count` ✅ Created
- **Real-time Updates**: ✅ Integrated via `RealtimeContext`

**Test Cases:**
- [ ] Add a comment - count should increase
- [ ] Comments should display with user info
- [ ] Real-time updates when new comments are added
- [ ] Comment creation should be disabled for unauthenticated users

## 🎯 **WHERE TO TEST**

### 📱 **Main Feed (`/`)**
- [ ] Like buttons on each book work
- [ ] Save buttons on each book work  
- [ ] Follow buttons on each book work
- [ ] Social counts display correctly
- [ ] Real-time updates work across different browser tabs

### 🎵 **Audio Player Modal**
- [ ] Social actions work within the modal
- [ ] Follow button works for channel
- [ ] Comments section functions properly
- [ ] Real-time updates work while modal is open

### 📺 **Channel Pages (`/channel/[username]`)**
- [ ] Follow button works on channel header
- [ ] Follower count updates in real-time
- [ ] Social actions work on channel's books

## 🔧 **DEBUGGING TOOLS**

### **Browser Developer Tools**
1. **Network Tab**: Check API calls to `/api/likes`, `/api/saves`, `/api/follows`, `/api/comments`
2. **Console**: Look for any JavaScript errors
3. **Application Tab**: Check Supabase real-time connections

### **Database Verification**
```sql
-- Check likes table
SELECT * FROM likes ORDER BY created_at DESC LIMIT 10;

-- Check saves table  
SELECT * FROM saves ORDER BY created_at DESC LIMIT 10;

-- Check follows table
SELECT * FROM follows ORDER BY created_at DESC LIMIT 10;

-- Check comments table
SELECT * FROM comments ORDER BY created_at DESC LIMIT 10;

-- Check counts on biglios table
SELECT id, title, like_count, comment_count, save_count FROM biglios;

-- Check follower counts on channels table
SELECT id, handle, follower_count FROM channels;
```

### **Real-time Debugging**
```javascript
// Check real-time connection in browser console
window.supabase.realtime.channels
```

## 🚨 **COMMON ISSUES TO CHECK**

### **Authentication Issues**
- [ ] User must be logged in to perform social actions
- [ ] API returns 401 for unauthenticated requests
- [ ] Social buttons show appropriate disabled state

### **Database Issues**
- [ ] RLS policies allow authenticated users to read/write
- [ ] Database functions exist and work correctly
- [ ] Foreign key constraints are satisfied

### **Real-time Issues**
- [ ] Supabase realtime is enabled for tables: `likes`, `saves`, `follows`, `comments`, `biglios`, `channels`
- [ ] RealtimeContext is properly initialized
- [ ] Updates propagate across different browser tabs/sessions

### **UI/UX Issues**
- [ ] Loading states show during API calls
- [ ] Error states handle failures gracefully
- [ ] Social counts format correctly (e.g., 1.2k for 1,200)
- [ ] Button states reflect current status (liked/unliked, followed/unfollowed)

## 🎯 **PRIORITY TEST SCENARIOS**

### **High Priority** 🔴
1. **Basic Like/Unlike Flow**: Like a book, refresh page, verify state persists
2. **Real-time Updates**: Like a book in one tab, verify count updates in another tab
3. **Authentication Flow**: Test social actions while logged out vs logged in

### **Medium Priority** 🟡  
1. **Follow/Unfollow Flow**: Follow a channel, verify follower count updates
2. **Save/Unsave Flow**: Save a book, verify it appears in user's saved list
3. **Comments Flow**: Add a comment, verify it appears and count updates

### **Low Priority** 🟢
1. **Edge Cases**: Test with very high counts, special characters in comments
2. **Performance**: Test with many rapid clicks, concurrent users
3. **Mobile Experience**: Test touch interactions on mobile devices

## ✅ **SUCCESS CRITERIA**

### **Functional Requirements**
- [ ] All social actions (like, save, follow, comment) work correctly
- [ ] Counts update immediately and persist across sessions
- [ ] Real-time updates work across multiple browser tabs
- [ ] Authentication is properly enforced

### **Performance Requirements**
- [ ] Social actions respond within 500ms
- [ ] Real-time updates appear within 2 seconds
- [ ] No memory leaks from real-time subscriptions

### **User Experience Requirements**
- [ ] Clear visual feedback for all social actions
- [ ] Intuitive button states (active/inactive)
- [ ] Graceful error handling with user-friendly messages
- [ ] Consistent behavior across all pages

## 📊 **TEST RESULTS**

Update this section after testing:

### **Likes System**: ❓ Not Tested Yet
- Main Feed: ❓
- Audio Modal: ❓ 
- Real-time: ❓

### **Saves System**: ❓ Not Tested Yet
- Main Feed: ❓
- Audio Modal: ❓
- Real-time: ❓

### **Follows System**: ❓ Not Tested Yet
- Channel Pages: ❓
- Main Feed: ❓
- Real-time: ❓

### **Comments System**: ❓ Not Tested Yet
- Audio Modal: ❓
- Real-time: ❓

## 🔧 **NEXT STEPS**

1. **Deploy Latest Changes**: ✅ Done
2. **Run Through Test Checklist**: ⏳ In Progress
3. **Fix Any Issues Found**: ⏳ Pending
4. **Document Known Issues**: ⏳ Pending
5. **Performance Optimization**: ⏳ Pending

---

**Note**: This is a living document. Update test results as you verify each feature!