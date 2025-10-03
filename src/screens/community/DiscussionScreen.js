import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { auth } from '../../services/firebase.config';
import { DiscussionService } from '../../services/community/discussion.service';
import PostService from '../../services/community/post.service';
import { COLORS } from '../../constants/colors';

const CommentItem = ({ comment, onReply }) => (
  <View style={[styles.commentCard, comment.parentCommentId && styles.replyCard]}>
    <Text style={styles.commentAuthor}>{comment.authorName || 'Community Member'}</Text>
    <Text style={styles.commentContent}>{comment.content}</Text>
    <TouchableOpacity onPress={() => onReply(comment)}>
      <Text style={styles.replyLink}>Reply</Text>
    </TouchableOpacity>
  </View>
);

const DiscussionScreen = ({ route, navigation }) => {
  const { postId } = route.params || {};
  const user = auth.currentUser;
  const discussionService = useMemo(() => (user ? new DiscussionService(user.uid) : null), [user?.uid]);
  const postService = useMemo(() => (user ? new PostService(user.uid) : null), [user?.uid]);

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!discussionService || !postService || !postId) return;
    setLoading(true);
    try {
      const [postDoc, commentList] = await Promise.all([
        postService.getPost(postId),
        discussionService.getComments(postId),
      ]);
      setPost(postDoc || null);
      setComments(commentList);
    } catch (error) {
      Alert.alert('Error', 'Unable to load discussion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [discussionService, postService, postId]);

  const handleSubmit = async () => {
    if (!discussionService || !input.trim()) return;
    setSubmitting(true);
    try {
      await discussionService.addComment({
        postId,
        parentCommentId: replyTo?.id || null,
        content: input.trim(),
      });
      setInput('');
      setReplyTo(null);
      load();
    } catch (error) {
      Alert.alert('Error', error.message || 'Unable to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>Sign in to participate in discussions.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discussion</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primaryGreen} />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 20 }}
          ListHeaderComponent={() => (
            <View style={styles.postCard}>
              <Text style={styles.postAuthor}>{post?.authorName || 'Community Member'}</Text>
              <Text style={styles.postContent}>{post?.content}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <CommentItem comment={item} onReply={setReplyTo} />
          )}
        />
      )}

      <View style={styles.composer}>
        {replyTo && (
          <View style={styles.replyBanner}>
            <Text style={styles.replyBannerText}>Replying to {replyTo.authorName || 'member'}</Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Text style={styles.clearReply}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Add a comment"
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.sendText}>{submitting ? 'Posting…' : 'Post'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.primaryGreen,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: COLORS.pureWhite, fontSize: 20 },
  headerTitle: { color: COLORS.pureWhite, fontSize: 20, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoText: { color: '#6B7280' },
  postCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  postAuthor: { fontWeight: '700', color: '#111827', marginBottom: 6 },
  postContent: { color: '#374151' },
  commentCard: {
    backgroundColor: COLORS.pureWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  replyCard: {
    marginLeft: 20,
    backgroundColor: '#F1F5F9',
  },
  commentAuthor: { fontWeight: '600', color: '#1F2937' },
  commentContent: { marginTop: 6, color: '#4B5563' },
  replyLink: { marginTop: 8, color: COLORS.primaryGreen, fontWeight: '600' },
  composer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: COLORS.pureWhite,
  },
  replyBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  replyBannerText: { color: '#4B5563', fontStyle: 'italic' },
  clearReply: { color: '#D32F2F', fontWeight: '600' },
  input: {
    backgroundColor: '#F4F6FB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
    textAlignVertical: 'top',
    color: '#374151',
  },
  sendButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sendText: { color: COLORS.pureWhite, fontWeight: '700' },
});

export default DiscussionScreen;
