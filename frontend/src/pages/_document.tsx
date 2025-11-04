import { Html, Head, Main, NextScript } from 'next/document'
import { themeScript } from '../utils/theme-script'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Proper viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
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