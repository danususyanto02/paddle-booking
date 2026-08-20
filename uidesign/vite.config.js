import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

const r = (p) => resolve(import.meta.dirname, p)

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: r('index.html'),
        courts: r('courts.html'),
        'court-detail': r('court-detail.html'),
        booking: r('booking.html'),
        checkout: r('checkout.html'),
        success: r('success.html'),
        dashboard: r('dashboard.html'),
        login: r('login.html'),
        register: r('register.html'),
        admin: r('admin/index.html'),
        'admin-courts': r('admin/courts.html'),
        'admin-members': r('admin/members.html'),
        'admin-bookings': r('admin/bookings.html'),
        'admin-reports': r('admin/reports.html'),
        notfound: r('404.html'),
      },
    },
  },
})
