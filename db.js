// db.js

const mongoose = require('mongoose');
const URLSlugs = require('mongoose-url-slugs');

//schema goes here!!!
const User = new mongoose.Schema({
	username: String,
	password: String,
	state: String,

	completedRequests: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Request"
	}],
	pendingRequests: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Request"
	}],
	myAnimals: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Animal"
	}],
	myRequests: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Request"
	}]
});

const Animal = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
	},
	name: String,
	description: String,
	ownerID: String
});

const Request = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
	},
	message: String,
	requestID: String,
	transferred: Boolean,
	animal: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Animal"
	}
});

Animal.plugin(URLSlugs("name"));
mongoose.model('User', User);
mongoose.model('Request', Request);
mongoose.model('Animal', Animal);
//for when deployed
var url = 'mongodb://admin:password@ds113746.mlab.com:13746/final';
mongoose.connect(url);

//removed when deployed
//mongoose.connect('mongodb://localhost/final'); 