#import "OauthEssentials.h"
#import <AuthenticationServices/AuthenticationServices.h>
#import "OauthEssentials-Swift.h"
#if __has_include("OauthEssentials/OauthEssentials-Swift.h")
#import "OauthEssentials/OauthEssentials-Swift.h"
#else
#import "OauthEssentials-Swift.h"
#endif

@implementation OauthEssentials {
  OauthEssentialsModule *_sModule;
}

// Init
- (instancetype)init
{
  self = [super init];
  if (self) {
    _sModule = [[OauthEssentialsModule alloc] init];
  }
  return self;
}

// TurboModule
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeOauthEssentialsSpecJSI>(params);
}

// Module name
+ (NSString *)moduleName
{
  return @"OauthEssentials";
}

// Constants
- (NSDictionary *)getConstants
{
  return [_sModule getConstants];
}

// Methods
- (void)googleSignIn:(NSString *)clientId
             options:(NSDictionary *)options
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject
{
  [_sModule googleSignIn:clientId
                  options:options
                 resolver:resolve
                 rejecter:reject];
}

- (void)appleSignIn:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  [_sModule appleSignIn:resolve rejecter:reject];
}

- (void)passwordSignIn:(NSString *)username
              password:(NSString *)password
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject
{
  [_sModule passwordSignIn:username
                  password:password
                  resolver:resolve
                  rejecter:reject];
}

- (void)getPassword:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  [_sModule getPasswordWithResolver:resolve
                            rejecter:reject];
}

@end
