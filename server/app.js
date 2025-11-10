console.log('hi')
const express=require('express')
const app=express()
const dotenv=require('dotenv')
const cors=require('cors')
const cookieParser=require('cookie-parser')
dotenv.config();
const bodyparser=require('body-parser')
app.use(bodyparser.json())

require('./db/conn')
const port=require('./db/conn')
const user=require('./model/userSchema')
app.use(express.json())
app.use(cors({
    origin:'*',
    methods:['GET','POST','PUT','PATCH']
}))
app.use(require('./router/auth')) //main file

app.listen(8000,()=>{
    console.log(`server is listening ${8000}`);
})
