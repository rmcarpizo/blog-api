const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { protect } = require('../middleware/auth');

const postValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 5, max: 150 }).withMessage('Title must be 5-150 characters'),
  body('content')
    .trim()
    .notEmpty().withMessage('Content is required')
    .isLength({ min: 20 }).withMessage('Content must be at least 20 characters'),
];

// @route   GET /api/posts
// @access  Public
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username email')
      .sort({ createdAt: -1 });
    res.status(200).json({ posts });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch posts', error: error.message });
  }
});

// @route   GET /api/posts/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username email');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.status(200).json({ post });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch post', error: error.message });
  }
});

// @route   POST /api/posts
// @access  Private
router.post('/', protect, postValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, content } = req.body;

  try {
    const post = await Post.create({ title, content, author: req.user._id });
    await post.populate('author', 'username email');
    res.status(201).json({ message: 'Post created successfully!', post });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create post', error: error.message });
  }
});

// @route   PUT /api/posts/:id
// @access  Private (author only)
router.put('/:id', protect, postValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this post' });
    }

    post.title = req.body.title;
    post.content = req.body.content;
    await post.save();
    await post.populate('author', 'username email');

    res.status(200).json({ message: 'Post updated successfully!', post });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update post', error: error.message });
  }
});

// @route   DELETE /api/posts/:id
// @access  Private (author or admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ post: req.params.id });

    res.status(200).json({ message: 'Post deleted successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete post', error: error.message });
  }
});

module.exports = router;
