import axios from 'axios'
import React, { useContext, useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { useNavigate } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css';
import { UserContext } from '../App'
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { ApiEndPoint } from '../server/ApiEndPoint.constant'




function LogIn() {
    const { state, dispatch } = useContext(UserContext)
    const navigate = useNavigate()

    let userToken;
    const [userData, setUserData] = useState({
        email: "",
        password: ""
    })
    const [otp, setOtp] = useState("")
    const [showOtpInput, setShowOtpInput] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [num, changenum] = useState(0)
    const [section, changeSec] = useState('bg-gray-50 dark:bg-gray-900')
    const [mainDiv, changeMain] = useState('w-full bg-white  rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700')
    const [title, changeTitle] = useState('text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white')
    const [text, changeText] = useState('text-sm font-light text-gray-500 dark:text-gray-300')
    const [input, changeinp] = useState('bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500')
    const [theme, changeTheme] = useState(<WbSunnyIcon />)

    useEffect(() => {
        console.log(localStorage.getItem('state'));
        console.log(Cookies.get('userData'));
    }, [])
    const handleInputs = (e) => {
        const name = e.target.name
        const value = e.target.value
        setUserData({ ...userData, [name]: value })
    }
    const states = () => {
        var headers = new Headers();
        headers.append("X-CSCAPI-KEY", "API_KEY");

        var requestOptions = {
            method: 'GET',
            headers: headers,
            redirect: 'follow'
        };

        fetch("https://api.countrystatecity.in/v1/states", requestOptions)
            .then(response => response.text())
            .then(result => console.log(result))
            .catch(error => console.log('error', error));
    }
    const postData = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        
        if (!showOtpInput) {
            // Step 1: Send OTP
            try {
                const response = await axios.post(`${ApiEndPoint}/send-otp`, userData, { headers: { "name": "ved" } })
                if (response.status === 200) {
                    setShowOtpInput(true)
                    toast.success("OTP sent to your email");
                }
            } catch (err) {
                console.log(err)
                const errorMsg = err.response?.data?.error || "Failed to send OTP"
                toast.error(errorMsg);
            } finally {
                setIsLoading(false)
            }
        } else {
            // Step 2: Verify OTP
            try {
                const response = await axios.post(`${ApiEndPoint}/verify-otp`, {
                    email: userData.email,
                    otp: otp
                }, { headers: { "name": "ved" } })
                
                if (response.status === 200) {
                    userToken = response.data.token
                    let admin = response.data.admin
                    setTimeout(() => {
                        toast.success("Successfully logged in");
                    }, 200);
                    Cookies.set("userData", userToken, {
                        expires: new Date(Date.now() + 9999999999),
                    })
                    console.log(Cookies.get("userData"));
                    localStorage.setItem('userData', JSON.stringify(userToken))
                    localStorage.setItem('admin', JSON.stringify(admin))
                    if (admin) {
                        dispatch({ type: "ADMIN", payload: true })
                        navigate('/admin')
                    } else {
                        dispatch({ type: "USER", payload: true })
                        navigate('/')
                    }
                }
            } catch (err) {
                console.log(err)
                const errorMsg = err.response?.data?.error || "Invalid OTP"
                toast.error(errorMsg);
            } finally {
                setIsLoading(false)
            }
        }
    }



    return (
        <section className={section}>
            <ToastContainer />
            <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen max-sm:px-0,py-0 lg:py-0">
                <div className={mainDiv}>
                    <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
                        <h1 className={title}>
                            Sign in to your account
                        </h1>
                        <form className="space-y-4 md:space-y-6" action="">
                            {!showOtpInput ? (
                                <>
                                    <div>
                                        <input 
                                            type="email" 
                                            name="email" 
                                            id="email" 
                                            value={userData.email} 
                                            onChange={handleInputs} 
                                            className={input} 
                                            placeholder="Your Email Address" 
                                            required 
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div>
                                        <input 
                                            type="password" 
                                            name="password" 
                                            id="password" 
                                            value={userData.password} 
                                            onChange={handleInputs} 
                                            placeholder="••••••••" 
                                            className={input} 
                                            required 
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-start">
                                            <div className="flex items-center h-5">
                                                <input id="remember" aria-describedby="remember" type="checkbox" className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-primary-600 dark:ring-offset-gray-800" required="" />
                                            </div>
                                            <div className="ml-3 text-sm">
                                                <label htmlFor="remember" className={text}>Remember me</label>
                                            </div>
                                        </div>
                                        <a href="" onClick={() => {
                                            navigate('/forget')
                                        }} className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-500">Forgot password?</a>
                                    </div>
                                    <button 
                                        type="submit" 
                                        onClick={postData} 
                                        disabled={isLoading}
                                        className="w-full text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? "Sending OTP..." : "Send OTP"}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <p className={text + " mb-2"}>
                                            OTP has been sent to your email. Please enter the 6-digit OTP below.
                                        </p>
                                        <input 
                                            type="text" 
                                            name="otp" 
                                            id="otp" 
                                            value={otp} 
                                            onChange={(e) => setOtp(e.target.value)} 
                                            className={input} 
                                            placeholder="Enter 6-digit OTP" 
                                            required 
                                            maxLength="6"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setShowOtpInput(false)
                                                setOtp("")
                                            }}
                                            disabled={isLoading}
                                            className="w-full text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Back
                                        </button>
                                        <button 
                                            type="submit" 
                                            onClick={postData} 
                                            disabled={isLoading || otp.length !== 6}
                                            className="w-full text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? "Verifying..." : "Verify OTP"}
                                        </button>
                                    </div>
                                </>
                            )}
                            <p className={text}>
                                Don't have an account yet? <a href="" onClick={() => {
                                    navigate('/signup')
                                }} className="font-medium text-primary-600 hover:underline dark:text-primary-500">Sign up</a>
                            </p>
                        </form>
                    </div>
                </div>
                <div className='flex'>

                    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        onClick={() => {
                            if (num === 0) {
                                changenum(1)
                                changeTheme(<DarkModeIcon />)
                                changeSec('bg-gray-50 dark:bg-white-100')
                                changeMain('w-full bg-dark  rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-200 dark:border-gray-600')
                                changeTitle('text-xl font-bold leading-tight tracking-tight text-gray-700 md:text-2xl dark:text-dark')
                                changeText('text-sm font-light text-gray-900 dark:text-gray-800')
                                changeinp('bg-gray-50 border border-gray-700 text-gray-300 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-300 dark:border-gray-600 dark:placeholder-gray-600 dark:text-gray-900 dark:focus:ring-blue-500 dark:focus:border-blue-500')

                            } else {
                                changenum(0)
                                changeTheme(<WbSunnyIcon />)
                                changeSec('bg-gray-50 dark:bg-gray-900')
                                changeMain('w-full bg-white  rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700')
                                changeTitle('text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white')
                                changeText('text-sm font-light text-gray-500 dark:text-gray-300')
                                changeinp('bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500')

                            }

                        }}>
                        {theme}
                    </button>
                    {/* <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={states}>api</button> */}
                </div>
            </div>
        </section>
    )
}

export default LogIn
