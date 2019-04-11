const mongoose =  require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Task = require('./task');

const secret = process.env.JWT_SECRET;

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 7,
        validate(value) {
            if (value.toLowerCase().includes('password'))
                throw new Error('Passord cannot include word ', value);
        }
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        toLower: true,
        validate(value) {
            if (!validator.isEmail(value))
                throw new Error('Invalid email address');
        }
    },
    age: {
        type: Number,
        default: 18,
        validate(value) {
            if (value < 18)
                throw new Error('Under age (minimum 18 required)');
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    avatar: {
        type: Buffer
    }
}, {
    timestamps: true
});

userSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'owner' 
});

// This function runs automatically when ever User object is returned to client.
// Remove unwanted properties from User
userSchema.methods.toJSON = function() {
    const user = this;
    const userObject = user.toObject();

    delete userObject.password;
    delete userObject.tokens;
    delete userObject.avatar;
    delete userObject.__v;

    return userObject;
};

// This is function is accessible only by the instance (object)
userSchema.methods.generateAuthToken = async function() {
    const user = this;
    const token = jwt.sign({ _id: user._id.toString() }, secret);

    user.tokens = user.tokens.concat({token});
    await user.save();

    return token;
};

// This is function is accessible in the model (class)
userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email });

    if (!user) throw new Error('Unable to login');

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) throw new Error('Unable to login');

    return user;
};

// delete tasks before deleting user (cascade delete)
userSchema.pre('remove', async function(next) {
    const user = this;

    await Task.deleteMany({owner: user._id});

    next();
})

// Hash the plain text password before save
userSchema.pre('save', async function(next) {
    const user = this;

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }
    
    next();
})

const User = mongoose.model('User', userSchema);

module.exports = User;