# 🚗 Rydex — On-Demand Multi-Vehicle Booking & Logistics Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-rydex--xi.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://rydex-xi.vercel.app/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/vibhanshu000/Rydex)

🌐 **Live Website**: [https://rydex-xi.vercel.app](https://rydex-xi.vercel.app/)

---

**Rydex** is an end-to-end, full-stack vehicle booking and logistics platform engineered to handle everything from daily personal commutes to heavy commercial freight. Built with Next.js 16, Socket.IO, MongoDB, and modern real-time WebRTC/geospatial technologies.

---

## ✨ Key Features

- 👥 **Multi-Role Ecosystem**: Tailored dashboards and workflows for **Riders (Users)**, **Driver Partners**, and **Platform Administrators**.
- 🛵 **Multi-Vehicle Support**: Supports bikes, autos, cars, delivery vehicles, and freight trucks.
- 📍 **Real-Time GPS Tracking & Dispatch**: Live driver location updates, dynamic route rendering with Leaflet, and geospatial querying (`2dsphere`) powered by MongoDB.
- ⚡ **Real-Time Socket Architecture**: Dedicated Node.js + Socket.IO server handling instant ride requests, automated dispatch, ride rooms, and live driver-rider communication.
- 📹 **Remote Video KYC Verification**: Built-in video KYC verification powered by **ZEGOCLOUD** WebRTC for admin verification of onboarding partners and compliance documents.
- 🔐 **OTP-Verified Ride Lifecycle**: Secure ride initiation and drop-off validation via automated, expiring Pickup and Drop OTPs.
- 💳 **Integrated Payments & Revenue Split**: Seamless online payments via **Razorpay**, automated platform commission deductions, and partner payouts.
- 📁 **Cloud Document Management**: Secure multi-step partner onboarding with document and vehicle inspection uploads powered by **Cloudinary**.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Motion (Framer Motion), Lucide React, Recharts
- **State Management**: Redux Toolkit & React-Redux
- **Maps & Geolocation**: Leaflet & React-Leaflet
- **Backend & APIs**: Next.js Serverless Route Handlers, Express.js
- **Database & ODM**: MongoDB & Mongoose (Geospatial indexing)
- **Real-Time Communication**: Socket.IO (WebSockets)
- **Video KYC & WebRTC**: ZEGOCLOUD UIKits
- **Auth & Security**: NextAuth.js (Auth.js v5 beta), Bcrypt, Nodemailer
- **Payments & Storage**: Razorpay SDK, Cloudinary SDK