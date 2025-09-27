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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWdhdGV3YXktY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLWdhdGV3YXktY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHlEQUF5RDtBQUN6RCxtQ0FBbUM7QUFPbkMsTUFBYSxlQUFnQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBRzVDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMkI7UUFDbkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzVELFdBQVcsRUFBRSxzQkFBc0I7WUFDbkMsV0FBVyxFQUFFLHlDQUF5QztZQUN0RCwyQkFBMkIsRUFBRTtnQkFDM0IsWUFBWSxFQUFFLENBQUMsdUJBQXVCLENBQUM7Z0JBQ3ZDLFlBQVksRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUM7Z0JBQ3pELFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQztnQkFDbkIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQzthQUNwQztZQUNELGdCQUFnQixFQUFFLENBQUMsS0FBSyxDQUFDO1lBQ3pCLE1BQU0sRUFBRSxJQUFJO1lBQ1osYUFBYSxFQUFFO2dCQUNiLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUztnQkFDMUIsY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLFlBQVksRUFBRSxVQUFVLENBQUMsa0JBQWtCLENBQUMsSUFBSTtnQkFDaEQsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsY0FBYyxFQUFFLElBQUk7YUFDckI7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUEzQkQsMENBMkJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXBpR2F0ZXdheVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHN0YWdlTmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgQXBpR2F0ZXdheVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBcGlHYXRld2F5U3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgdGhpcy5hcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdUcmF2ZWxDb21wYW5pb25BcGknLCB7XG4gICAgICByZXN0QXBpTmFtZTogJ1RyYXZlbCBDb21wYW5pb24gQVBJJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIGZvciB0aGUgQXV0b25vbW91cyBUcmF2ZWwgQ29tcGFuaW9uJyxcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IFsnaHR0cDovL2xvY2FsaG9zdDozMDAwJ10sXG4gICAgICAgIGFsbG93TWV0aG9kczogWydHRVQnLCAnUE9TVCcsICdQVVQnLCAnREVMRVRFJywgJ09QVElPTlMnXSxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJyonXSxcbiAgICAgICAgYWxsb3dDcmVkZW50aWFsczogdHJ1ZSxcbiAgICAgICAgbWF4QWdlOiBjZGsuRHVyYXRpb24uc2Vjb25kcyg4NjQwMClcbiAgICAgIH0sXG4gICAgICBiaW5hcnlNZWRpYVR5cGVzOiBbJyovKiddLFxuICAgICAgZGVwbG95OiB0cnVlLFxuICAgICAgZGVwbG95T3B0aW9uczoge1xuICAgICAgICBzdGFnZU5hbWU6IHByb3BzLnN0YWdlTmFtZSxcbiAgICAgICAgdHJhY2luZ0VuYWJsZWQ6IHRydWUsXG4gICAgICAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcbiAgICAgICAgZGF0YVRyYWNlRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgbWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG59Il19
