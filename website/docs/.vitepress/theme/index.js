import DefaultTheme from 'vitepress/theme'
import './custom.css'
import AdminDemos from './AdminDemos.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('AdminDemos', AdminDemos)
  },
}
