"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiGatewayStack = void 0;
const apigateway = require("aws-cdk-lib/aws-apigateway");
const cdk = require("aws-cdk-lib");
class ApiGatewayStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        this.api = new apigateway.RestApi(this, 'TravelCompanionApi', {
            restApiName: 'Travel Companion API',
            description: 'API for the Autonomous Travel Companion',
            defaultCorsPreflightOptions: {
                allowOrigins: ['http://localhost:3000'],
                allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowHeaders: ['*'],
                allowCredentials: true,
                maxAge: cdk.Duration.seconds(86400)
            },
            binaryMediaTypes: ['*/*'],
            deploy: true,
            deployOptions: {
                stageName: props.stageName,
                tracingEnabled: true,
                loggingLevel: apigateway.MethodLoggingLevel.INFO,
                dataTraceEnabled: true,
                metricsEnabled: true,
            },
        });
    }
}
exports.ApiGatewayStack = ApiGatewayStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWdhdGV3YXktY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLWdhdGV3YXktY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHlEQUF5RDtBQUN6RCxtQ0FBbUM7QUFPbkMsTUFBYSxlQUFnQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBRzVDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMkI7UUFDbkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzVELFdBQVcsRUFBRSxzQkFBc0I7WUFDbkMsV0FBVyxFQUFFLHlDQUF5QztZQUN0RCwyQkFBMkIsRUFBRTtnQkFDM0IsWUFBWSxFQUFFLENBQUMsdUJBQXVCLENBQUM7Z0JBQ3ZDLFlBQVksRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUM7Z0JBQ3pELFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQztnQkFDbkIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQzthQUNwQztZQUNELGdCQUFnQixFQUFFLENBQUMsS0FBSyxDQUFDO1lBQ3pCLE1BQU0sRUFBRSxJQUFJO1lBQ1osYUFBYSxFQUFFO2dCQUNiLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUztnQkFDMUIsY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLFlBQVksRUFBRSxVQUFVLENBQUMsa0JBQWtCLENBQUMsSUFBSTtnQkFDaEQsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsY0FBYyxFQUFFLElBQUk7YUFDckI7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUEzQkQsMENBMkJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBcGlHYXRld2F5U3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICBzdGFnZU5hbWU6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEFwaUdhdGV3YXlTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQXBpR2F0ZXdheVN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIHRoaXMuYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnVHJhdmVsQ29tcGFuaW9uQXBpJywge1xyXG4gICAgICByZXN0QXBpTmFtZTogJ1RyYXZlbCBDb21wYW5pb24gQVBJJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgZm9yIHRoZSBBdXRvbm9tb3VzIFRyYXZlbCBDb21wYW5pb24nLFxyXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcclxuICAgICAgICBhbGxvd09yaWdpbnM6IFsnaHR0cDovL2xvY2FsaG9zdDozMDAwJ10sXHJcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbJ0dFVCcsICdQT1NUJywgJ1BVVCcsICdERUxFVEUnLCAnT1BUSU9OUyddLFxyXG4gICAgICAgIGFsbG93SGVhZGVyczogWycqJ10sXHJcbiAgICAgICAgYWxsb3dDcmVkZW50aWFsczogdHJ1ZSxcclxuICAgICAgICBtYXhBZ2U6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDg2NDAwKVxyXG4gICAgICB9LFxyXG4gICAgICBiaW5hcnlNZWRpYVR5cGVzOiBbJyovKiddLFxyXG4gICAgICBkZXBsb3k6IHRydWUsXHJcbiAgICAgIGRlcGxveU9wdGlvbnM6IHtcclxuICAgICAgICBzdGFnZU5hbWU6IHByb3BzLnN0YWdlTmFtZSxcclxuICAgICAgICB0cmFjaW5nRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBsb2dnaW5nTGV2ZWw6IGFwaWdhdGV3YXkuTWV0aG9kTG9nZ2luZ0xldmVsLklORk8sXHJcbiAgICAgICAgZGF0YVRyYWNlRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBtZXRyaWNzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH1cclxufSJdfQ==