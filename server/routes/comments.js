const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');

const commentValidation = [
  body('content')
    .trim()
    .notEmpty().withMessage('Comment cannot be empty')
    .isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters'),
];

// @route   GET /api/comments/post/:postId
// @access  Public
router.get('/post/:postId', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'username')
      .sort({ createdAt: -1 });
    res.status(200).json({ comments });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch comments', error: error.message });
  }
});

// @route   POST /api/comments/:postId
// @access  Private
router.post('/:postId', protect, commentValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await Comment.create({
      content: req.body.content,
      author: req.user._id,
      post: req.params.postId,
    });

    await comment.populate('author', 'username');
    res.status(201).json({ message: 'Comment added!', comment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add comment', error: error.message });
  }
});

// @route   DELETE /api/comments/:id
// @access  Private (author or admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await Comment.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Comment deleted!' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete comment', error: error.message });
  }
});

module.exports = router;
