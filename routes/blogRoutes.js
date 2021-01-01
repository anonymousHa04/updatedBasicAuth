const express = require('express');
const Blog = require('../db/blog');
const router = new express.Router()
const auth = require('../middleware/auth')
const multer = require('multer');
// const {Storage} = require('@google-cloud/storage');
const path = require('path')
const AWS = require('aws-sdk')
const fs = require('fs')

// require()

// AWSAccessKeyId=AKIAJ3B2ORTNDCNMN4GA
// AWSSecretKey=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

// setting s3
const s3 = new AWS.S3({
    signatureVersion: 'v4',
    accessKeyId: 'AKIAJ3B2ORTNDCNMN4GA',
    secretAccessKey: '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'
})

// console.log(process.env)


// posting a blog
router.post('/postBlog', auth, async (req, res) => {
    const blog = new Blog({
        ...req.body,
        owner: req.user._id
    })

    try {
        await blog.save()
        res.status(201).send(blog)
    } catch {
        res.status(400).send(e)
    }
})

// getting all the blogs
router.get('/blogs', async (req, res) => {
    const ownerId = req.params.ownerid
    try {

        const blog = await Blog.find({}).populate('owner')
        res.status(200).send(blog)

    } catch (error) {
        console.log(error)
        res.status(400).send(error)
    }
})

// getting user blogs
// /blogs?owner= `id Of An Owner`
router.get('/blogs/:ownerid', async (req, res) => {
    const ownerId = req.params.ownerid
    try {

        const blog = await Blog.find({ owner: ownerId }).populate('owner')
        res.status(200).send(blog)

    } catch (error) {
        console.log(error)
        res.status(400).send(error)
    }
})

//getting a particular blog
router.get('/blog/:id', async (req, res) => {
    const _id = req.params.id

    try {
        const blog = await Blog.findOne({ _id }).populate('owner')

        if (!blog) {
            return res.status(404).send('No blog found')
        }

        // console.log(blog.owner)
        res.send({ blog: blog, owner: blog.owner.name })
    } catch (e) {
        console.log(e)
        res.status(500).send(e)
    }
})

// updating a blog

router.patch('/blog/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['blog', 'title']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' })
    }

    try {
        const blog = await Blog.findOne({ _id: req.params.id, owner: req.user._id })

        if (!blog) {
            return res.status(404).send()
        }

        updates.forEach((update) => blogk[update] = req.body[update])
        await blog.save()
        res.send(blog)
    } catch (e) {
        res.status(400).send(e)
    }
})

//deleting a blog

router.delete('/blog/:id', auth, async (req, res) => {
    try {
        const blog = await Blog.findOneAndDelete({ _id: req.params.id, owner: req.user._id })

        if (!blog) {
            res.status(404).send()
        }

        res.send(blog)
    } catch (e) {
        res.status(500).send('Unable to delete')
    }
})

// uploading files
let storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname)
        if (ext !== '.jpg' && ext !== '.png' && ext !== '.mp4' && ext !=='.jpeg') {
            return cb(res.status(400).end('only jpg, png, mp4 is allowed'), false);
        }
        cb(null, true)
    }
});

const upload = multer({ storage: storage }).single("file");

router.post("/uploadfiles",upload, (req, res) => {

    // console.log(req.file)
    const params = {
        Bucket: 'assassian-image-bucket',
        Key: req.file.filename,
        Body: req.file.path
    }
    // res.send(`he;llo bhruf`)

    s3.upload(params, (err, data) => {
        if(err) {
            res.status(500).send(err)
        }
        
        // delete self generated file
        fs.unlink(`./${req.file.filename}`, (err) => {
            if(err){
                console.log(err)
            }

            res.status(200).send(data)
        })
    })
});


module.exports = router