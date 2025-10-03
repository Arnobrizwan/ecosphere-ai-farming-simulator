import { db } from '../firebase.config';
import { collection, addDoc, updateDoc, doc, query, where, orderBy, getDocs, increment } from 'firebase/firestore';

/**
 * Discussion Service (UC31) - Participate in discussions
 */
export class DiscussionService {
  constructor(userId) {
    this.userId = userId;
    this.commentsCollection = collection(db, 'comments');
  }

  async addComment(commentData) {
    const { postId, parentCommentId = null, content } = commentData;

    const comment = {
      postId,
      parentCommentId,
      authorId: this.userId,
      content,
      reactions: {
        like: 0,
        helpful: 0
      },
      replyCount: 0,
      edited: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const docRef = await addDoc(this.commentsCollection, comment);

    // Update post comment count
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      commentCount: increment(1)
    });

    // Update parent comment reply count
    if (parentCommentId) {
      const parentRef = doc(db, 'comments', parentCommentId);
      await updateDoc(parentRef, {
        replyCount: increment(1)
      });
    }

    return { id: docRef.id, ...comment };
  }

  async reactToComment(commentId, reactionType) {
    const commentRef = doc(db, 'comments', commentId);
    
    await updateDoc(commentRef, {
      [`reactions.${reactionType}`]: increment(1)
    });
  }

  async getComments(postId) {
    const q = query(
      this.commentsCollection,
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async updateComment(commentId, content) {
    const commentRef = doc(db, 'comments', commentId);
    
    await updateDoc(commentRef, {
      content,
      edited: true,
      updatedAt: Date.now()
    });
  }
}

export default DiscussionService;
