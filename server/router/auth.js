const express = require('express')
const path = require('path')
const fs = require('fs')
const nodemailer = require('nodemailer')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const router = express.Router()

const User = require('../model/userSchema')
const Party = require('../model/partySchema')
const authenticate = require('../middleware/authenticate')

// In-memory OTP storage (email -> {otp, expiresAt, userData})
const otpStore = new Map()

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

// Clean expired OTPs
setInterval(() => {
    const now = Date.now()
    for (const [email, data] of otpStore.entries()) {
        if (data.expiresAt < now) {
            otpStore.delete(email)
        }
    }
}, 60000) // Clean every minute

let commonPath = path.resolve();
let stateDataPath = path.join(commonPath, "/data/StateData.json");
const data = require(stateDataPath)
const data1 = data


// const messagebird=require('')
router.get('/', (req, res) => {
    res.send('Hello from router 22')
})
router.post('/regi', async (req, res) => {
    console.log(req.body)
    const { name, email, phone, age, state, password, cpassword } = req.body
    if (!name || !email || !phone || !age || !state || !password || !cpassword) {
        return res.status(422).json({ error: "please fill it" })
    }
    try {
        const userExist = await User.findOne({ email: email })
        const userphone = await User.findOne({ phone: phone })
        console.log(userExist)
        if (userExist || userphone) {

            return res.status(422).json({ error: "user exists" })


        } else if (password != cpassword) {
            return res.status(422).json({ error: "password and confirm password must be same" })
        } else {
            if (age < 18) {
                return res.status(402).json({ error: "age must be greater than or equal to 18" })
            }
            const user = new User({ name, email, phone, age, state, password, cpassword })
            await user.save().then(() => {
                res.status(201).json({ message: "user registered" })
            })
        }

    } catch (err) {
        console.log(err)
    }


})

// Send OTP endpoint
router.post("/send-otp", async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(422).json({ error: "Please fill all fields" })
        }

        const userSignIn = await User.findOne({ email: email })
        if (!userSignIn) {
            return res.status(404).json({ error: "Invalid Credentials" })
        }

        const isMatch = await bcrypt.compare(password, userSignIn.password)
        if (!isMatch) {
            return res.status(404).json({ error: "Invalid Credentials" })
        }

        // Generate OTP
        const otp = generateOTP()
        const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes

        // Store OTP with user data
        otpStore.set(email.toLowerCase(), {
            otp,
            expiresAt,
            userId: userSignIn._id,
            email: userSignIn.email,
            name: userSignIn.name
        })

        // Send OTP via email
        try {
            var transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                service: 'gmail',
                port: 587,
                secure: false,
                requireTLS: true,
                auth: {
                    user: 'vaishali@gmail.com',
                    pass: '9725773100'
                }
            })

            var mail = {
                from: "vedantkhamar975@gmail.com",
                to: email,
                subject: "Login OTP Verification",
                html: `<h1>Hello ${userSignIn.name}</h1><br>
                <h2>Your OTP for login is: <b>${otp}</b></h2>
                <p>This OTP will expire in 5 minutes.</p>
                <p>If you didn't request this OTP, please ignore this email.</p>`
            }

            transporter.sendMail(mail, function (err, info) {
                if (err) {
                    console.log("Email error", err)
                    otpStore.delete(email.toLowerCase())
                    return res.status(500).json({ error: "Failed to send OTP" })
                } else {
                    return res.status(200).json({ message: "OTP sent to your email" })
                }
            })
        } catch (emailErr) {
            console.log(emailErr)
            otpStore.delete(email.toLowerCase())
            return res.status(500).json({ error: "Failed to send OTP" })
        }

    } catch (err) {
        console.log(err)
        return res.status(500).json({ error: "Internal server error" })
    }
})

// Verify OTP and complete login
router.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body
        if (!email || !otp) {
            return res.status(422).json({ error: "Please fill all fields" })
        }

        const storedData = otpStore.get(email.toLowerCase())
        if (!storedData) {
            return res.status(404).json({ error: "OTP expired or not found. Please request a new OTP." })
        }

        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(email.toLowerCase())
            return res.status(404).json({ error: "OTP expired. Please request a new OTP." })
        }

        if (storedData.otp !== otp) {
            return res.status(404).json({ error: "Invalid OTP" })
        }

        // OTP verified, complete login
        const userSignIn = await User.findById(storedData.userId)
        if (!userSignIn) {
            otpStore.delete(email.toLowerCase())
            return res.status(404).json({ error: "User not found" })
        }

        const token = await userSignIn.generateToken()
        res.cookie("userData", token, {
            expires: new Date(Date.now() + 999999999),
            httpOnly: true
        })

        // Remove OTP from store
        otpStore.delete(email.toLowerCase())

        let admin = userSignIn.isAdmin
        return res.status(200).json({ 
            message: "Login successful", 
            token: token, 
            admin: admin 
        })

    } catch (err) {
        console.log(err)
        return res.status(500).json({ error: "Internal server error" })
    }
})

// Keep old login endpoint for backward compatibility (optional - can be removed)
router.post("/login", async (req, res) => {
    try {
        const { phone, password } = req.body
        console.log(req.headers.name)
        if (!phone || !password) {
            return res.status(422).json({ error: "please fill it" })
        }

        const userSignIn = await User.findOne({ phone: phone })
        if (userSignIn) {
            const isMatch = await bcrypt.compare(password, userSignIn.password)
            const token = await userSignIn.generateToken()
            console.log('usersignincalled')
            res.cookie("userData", token, {
                expires: new Date(Date.now() + 999999999),
                httpOnly: true
            })
            console.log(req.cookies)
            // console.log(token)
            if (!isMatch) {
                return res.status(404).json({ error: "Invalid Credentials pass" })
            } else {
                bcrypt.compare(password, userSignIn.password).then(() => {

                    console.log("promise completed")
                }).catch(err => {
                    console.log(err)
                })
                let admin = userSignIn.isAdmin
                return res.status(200).json({ message: "user SignedIn Succesfully", token: token, admin: admin })

            }


        } else {
            return res.status(404).json({ error: "Invalid Credentials" })
        }

    } catch (err) {
        console.log(err)

    }



})
router.get('/about', authenticate, (req, res) => {
    // console.log(req.headers)
    console.log('about us called')
    console.log(req)
    const data = req.rootUser
    res.send(req.rootUser)
})
router.put('/about', authenticate, async (req, res) => {
    // console.log(req.headers)
    const { name, email, phone, age } = req.body
    if (!name || !email || !phone || !age) {
        return res.status(422).json({ error: "please fill it" })
    }
    try {
        const userSignIn = await User.findOne({ email: email })
        if (userSignIn) {
            userSignIn.name = name
            userSignIn.email = email
            userSignIn.phone = phone
            userSignIn.age = age
            await userSignIn.save().then(() => {
                return res.status(201).json({ message: "user edited succesfully" })
            })
        } else {
            return res.status(404).json({ error: "Invalid Credentials" })
        }
    } catch (err) {
        console.log(err)
        return res.status(404).json({ error: "Invalid Credentials" })
    }
})
router.post('/verify', async (req, res) => {
    try {
        const { phone } = req.body
        console.log(phone)
        const userSignIn = await User.findOne({ phone: phone })
        if (userSignIn) {
            return res.status(201).json({ message: "User is present" })
        }
    } catch (err) {
        console.log(err);
        return res.status(404).json({ error: "Invalid Credentials" })
    }
})
router.get('/logout', (req, res) => {
    // console.log(req.headers)
    console.log('logout')
    console.log(req.headers.token)
    const token = req.headers.token
    res.clearCookie(token, { path: '/' })
    res.status(200).send('user logged out')
})
router.put('/reset', async (req, res) => {
    // console.log(req.headers)
    const { phone, password, cpassword } = req.body

    try {
        if (!password || !cpassword) {
            return res.status(422).json({ error: "please fill it" })
        } else if (password != cpassword) {
            return res.status(422).json({ error: "password and confirm password must be same" })
        } else {
            const userSignIn = await User.findOne({ phone: phone })
            console.log(userSignIn)
            if (userSignIn) {
                userSignIn.password = password
                userSignIn.cpassword = cpassword
                await userSignIn.save().then(() => {
                    return res.status(201).json({ message: "password updated" })
                })
            } else {
                return res.status(404).json({ error: "Invalid Credentials" })
            }
        }
    } catch (err) {
        console.log(err)
        // return res.status(404).json({ error: "Invalid Credentials" })
    }
})
router.post('/contact', authenticate, async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body
        console.log(req.body)
        if (!name || !email || !phone || !subject || !message) {
            return res.status(422).json({ error: "please fill it" })
        }
        const userQuery = await User.findOne({ email: email })
        if (userQuery) {
            const contact = await userQuery.contactUs(name, email, phone, subject, message)

            res.status(200).json({ message: "your query has been submitted" })

        } else {
            res.status(404).json({ error: "user not found" })
        }
    } catch (err) {
        console.log(err)
    }
})


// const face= User.find({isVoted:true}).all()
// const abc=async()=>{
//     const faceAll=await User.find({})
//     console.log(faceAll)

// }
// abc()
let x = 10
console.log(!x < 12);
router.post('/voter', authenticate, async (req, res) => {
    const { voter, faceResult } = req.body
    let x = faceResult.x
    let y = faceResult.y
    let score = faceResult.score
    try {
        const voterRegi = await User.findOne({ voterId: voter })
        if (voterRegi) {
            return res.status(422).json({ error: 'VoterId Already Exist' })
        } else {
            const token = req.headers.token
            let count = 0
            const userSignIn = await User.findOne({ 'tokens.token': token })
            if (userSignIn) {
                userSignIn.voterId = voter
                const faceAll = await User.find({})
                for (const value of faceAll) {
                    if (
                        value.faceResult &&
                        value.faceResult.x !== undefined &&
                        value.faceResult.y !== undefined &&
                        value.faceResult.score !== undefined
                    ) {
                        console.log(x, y, score, value.faceResult.x, !(x < (value.faceResult.x - 10)));

                        if (x < value.faceResult.x || y < value.faceResult.y || score < value.faceResult.score) {
                            if (
                                !(x < value.faceResult.x - 10) &&
                                !(y < value.faceResult.y - 10) &&
                                !(score < value.faceResult.score - 0.1)
                            ) {
                                count = 1;
                                return res.status(402).json({ message: "Face Id already Registered" });
                            }
                        } else {
                            if (
                                !(x > value.faceResult.x + 10) &&
                                !(y > value.faceResult.y + 10) &&
                                !(score > value.faceResult.score + 0.1)
                            ) {
                                count = 1;
                                return res.status(402).json({ message: "Face Id already Registered" });
                            }
                        }
                    }
                }
                    
                userSignIn.faceResult = faceResult


                if (count == 0) {
                    await userSignIn.save().then(() => {
                        return res.status(201).json({ message: "Voter Id Registered" })
                    })
                }


            }
        }
    } catch (err) {
        console.log(err)
        return res.status(401).json({ message: "Some Error occured" })

    }
})
router.get('/voter', authenticate, async (req, res) => {
    const token = req.headers.token
    const userSignIn = await User.findOne({ 'tokens.token': token })
    console.log(userSignIn.voterId);
    if (userSignIn.voterId) {
        return res.status(201).json({ message: 'Voter Id is Checked' })
    } else {
        return res.status(401).json({ message: 'Voter Id missing' })

    }
})
router.get("/allState", authenticate, async (req, res) => {
    try {
        return res.status(200).json({ message: "user SignedIn Succesfully", state: data1 })

    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' })
    }
})
router.get('/state', authenticate, async (req, res) => {
    const token = req.headers.token
    const userSignIn = await User.findOne({ 'tokens.token': token })
    console.log(userSignIn);
    if (userSignIn) {
        const state = userSignIn.state
        const isVoted = userSignIn.isVoted
        const email = userSignIn.email
        const userName = userSignIn.name
        console.log(isVoted)
        return res.send({ state, email, isVoted, userName })
    } else {
        return res.status(401).json({ message: 'Invalid Token' })

    }
})
router.post('/voted', authenticate, async (req, res) => {

    const token = req.headers.token

    const { partyName, Id } = req.body
    console.log(partyName, Id)
    const count = 1
    const userSignIn = await User.findOne({ 'tokens.token': token })
    if (userSignIn.isVoted) {
        return res.status(401).json({ error: "Voter Already Voted" })
    } else {
        const voted = await Party.findOne({ partyName: partyName })
        if (voted) {
            voted.vote = voted.vote + count
            await voted.save().then(() => {
                userSignIn.isVoted = true
                userSignIn.save()
                return res.status(201).json({ message: "Vote Successfully Added" })
            })

        } else {
            const newParty = new Party({ partyName, Id })
            await newParty.save().then(() => {
                console.log('party Added')
            })
            // await newParty.save().then(() => {
            //     res.status(201).json({ message: "Party Registered" })

            // })
            if (newParty) {
                const voted = await Party.findOne({ partyName: partyName })
                if (voted) {
                    try {
                        voted.vote = 0 + count
                        console.log(voted.vote)
                        voted.save().then(() => {
                            userSignIn.isVoted = true
                            userSignIn.save()
                            return res.status(201).json({ message: "Vote Successfully Added" })
                        })
                    } catch (err) {
                        console.log(err)

                    }
                }


            }
        }

    }

})
// const abc=()=>{
//     const code="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NTQ5MWQ3YmVjMmU5ZjFhMzkxNDY1MDUiLCJpYXQiOjE2OTkyOTA1MDd9.Zhdl1pC9RPLtmuRyDoRQKEYkqBkNuGV1gIBljRR7aW0"
//     console.log(code.slice(code.length-10,code.length));

// }
// abc()
router.post("/mail", authenticate, async (req, res) => {
    const code = req.headers.token.toString()

    try {
        let { state, email, userName } = req.body;
        var transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: 'vedantkhamar975@gmail.com',
                pass: 'kvqxyzzsfayyljxq'
            }
        });
        console.log(email)
        var mail = {
            from: "vedantkhamar975@gmail.com", // sender address
            to: email, // list of receivers (THIS COULD BE A DIFFERENT ADDRESS or ADDRESSES SEPARATED BY COMMAS)
            subject: `Ballot Submitted for 2023 ${state}  Election`, // Subject line
            html: `<h1>Hello ${userName}</h1><br>
            <h2>Your Vote has been Registered Succesfully</h2>
      <h2>Confirmation Code: <b>${code.slice(code.length - 10, code.length)}</b></h2><br>
      <h2>For any queries kindly contact us at vedantkhamar975@gmail.com</h2>`
        };

        // send mail with defined transport object
        transporter.sendMail(mail, function (err, info) {
            if (err) {
                res.json({ success: false, error: err });
                console.log("erroe", err);
            }
            else {
                res.status(200).json({ success: true, message: "Message sent" });
            }

        });
    } catch (err) {
        console.log(err);
        return res.status(401).json({ message: 'error' })
    }

})

router.get('/parties', authenticate, async (req, res) => {
    let parties
    await Party.find({}).then(data => {
        parties = data
        console.log(parties);
        return res.send(parties)
    }).catch(err => {
        console.log(err);
        return res.status(401).json({ message: 'Invalid Token' })
    })

})
router.post('/addParty', authenticate, async (req, res) => {
    try {
        const { state, partyName, Id, contestantName } = req.body
        let name = partyName
        let constestant = contestantName
        let image = ''
        let id = parseInt(Id)
        const party = { name, constestant, image, id }
        console.log(party, state)
        data1.forEach(value => {
            if (value.state === state) {
                console.log(value.parties);
                value.parties.push(party)

            }
        })
        fs.writeFile(stateDataPath, JSON.stringify(data1), err => {
            console.log(err);
        })
        return res.status(201).json({ message: 'Party Added' })
    } catch (err) {
        console.log(err);
        return res.status(401).json({ message: 'Invalid Token' })
    }
})

router.post('/deleteParty', authenticate, async (req, res) => {
    try {
        let partyDetails = {}
        let parties = []
        let index = 0
        const { state, partyName } = req.body
        data1.forEach(value => {
            if (value.id === state) {
                parties = value.parties
                parties.forEach(val => {
                    if (val.name === partyName) {
                        partyDetails = val
                    }
                })
                index = parties.indexOf(partyDetails)
                parties.splice(index, 1)
                value.parties = parties

            }
        })
        console.log(data1[state - 1].parties);
        fs.writeFile(stateDataPath, JSON.stringify(data1), err => {
            console.log(err);
        })
        return res.status(201).json({ message: 'Party Deleted' })
    } catch (err) {
        console.log(err);
        return res.status(401).json({ message: 'Invalid Token' })
    }
})


module.exports = router