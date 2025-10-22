import { Html, Head, Main, NextScript } from 'next/document'
import { themeScript } from '../utils/theme-script'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Inject theme script to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}