import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';

/**
 * Searches for users by their display name.
 * @param {string} name The name to search for.
 * @returns {Promise<Array>} A promise that resolves to an array of user objects.
 */
export const searchUsers = async (name) => {
  if (!name) {
    return [];
  }
  const usersRef = collection(db, 'users');
  // Query for users where the displayName matches the search query.
  // Note: Firestore requires an index for this query.
  // The error message in the console will provide a link to create it if needed.
  const q = query(usersRef, where('displayName', '==', name));

  try {
    const querySnapshot = await getDocs(q);
    const users = [];
    querySnapshot.forEach((doc) => {
      // Don't include the current user in search results.
      if (doc.id !== auth.currentUser?.uid) {
        users.push({ id: doc.id, ...doc.data() });
      }
    });
    return users;
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
};

/**
 * Adds a friend to the current user's friend list.
 * @param {string} friendId The UID of the user to add as a friend.
 */
export const addFriend = async (friendId) => {
  if (!auth.currentUser) {
    throw new Error("No user is signed in.");
  }
  const userDocRef = doc(db, 'users', auth.currentUser.uid);
  try {
    await updateDoc(userDocRef, {
      friends: arrayUnion(friendId)
    });
    console.log("Friend added successfully!");
  } catch (error) {
    console.error("Error adding friend:", error);
  }
};

/**
 * Removes a friend from the current user's friend list.
 * @param {string} friendId The UID of the user to remove from the friends list.
 */
export const removeFriend = async (friendId) => {
  if (!auth.currentUser) {
    throw new Error("No user is signed in.");
  }
  const userDocRef = doc(db, 'users', auth.currentUser.uid);
  try {
    await updateDoc(userDocRef, {
      friends: arrayRemove(friendId)
    });
    console.log("Friend removed successfully!");
  } catch (error) {
    console.error("Error removing friend:", error);
  }
};

/**
 * Gets an existing conversation between two users or creates a new one.
 * @param {string} friendId The UID of the other user.
 * @returns {Promise<string>} A promise that resolves to the conversation ID.
 */
export const getOrCreateConversation = async (friendId) => {
  if (!auth.currentUser) {
    throw new Error("No user is signed in.");
  }
  const currentUserId = auth.currentUser.uid;
  const conversationId = [currentUserId, friendId].sort().join('_');
  const conversationDocRef = doc(db, 'conversations', conversationId);

  try {
    const docSnap = await getDoc(conversationDocRef);
    if (!docSnap.exists()) {
      // Conversation doesn't exist, create it.
      await setDoc(conversationDocRef, {
        participants: [currentUserId, friendId],
        lastMessage: {
          text: 'Conversation started.',
          createdAt: serverTimestamp(),
          senderId: currentUserId,
        },
      });
    }
    return conversationId;
  } catch (error) {
    console.error("Error getting or creating conversation:", error);
    throw error;
  }
};
