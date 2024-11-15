// forum.js 

const mongoose = require('mongoose');

const forumSchema = new mongoose.Schema({
    categories: [{ type: String }],
    topics: [
      {
        category: { type: String, required: true }, // Add category field to each topic
        title: { type: String, required: true },
        createdBy: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        posts: [
          {
            content: { type: String, required: true },
            createdBy: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
          },
        ],
      },
    ],
  });

const Forum = mongoose.model('Forum', forumSchema);

module.exports = Forum;
