// AWS CDK stack for Cognito User Pool and Google IdP integration
const cdk = require('aws-cdk-lib');
const cognito = require('aws-cdk-lib/aws-cognito');

class LambdaCognitoStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    const { environment } = props;

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `TravelCompanion-UserPool-${environment}`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: false },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    // Google Identity Provider
    this.googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'Google', {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecretValue: cdk.SecretValue.plainText(process.env.GOOGLE_CLIENT_SECRET),
      userPool: this.userPool,
      scopes: ['profile', 'email', 'openid'],
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
        familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
        profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
      },
    });

    // App client for web frontend
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
        adminUserPassword: true,
      },
      oAuth: {
        callbackUrls: ['http://localhost:3000/api/auth/callback/cognito'],
        logoutUrls: ['http://localhost:3000/'],
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
        cognito.UserPoolClientIdentityProvider.GOOGLE
      ],
    });

    // Google Identity Provider (to be configured with clientId/secret)
    // this.googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'Google', {
    //   clientId: process.env.GOOGLE_CLIENT_ID,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    //   userPool: this.userPool,
    //   scopes: ['profile', 'email', 'openid'],
    //   attributeMapping: {
    //     email: cognito.ProviderAttribute.GOOGLE_EMAIL,
    //     givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
    //     familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
    //     profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
    //   },
    // });

    // Output User Pool and Client IDs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      exportName: `${environment}-UserPoolId`,
    });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      exportName: `${environment}-UserPoolClientId`,
    });
  }
}

module.exports = { LambdaCognitoStack };
