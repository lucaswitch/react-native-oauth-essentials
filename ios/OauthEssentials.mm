#import "OauthEssentials.h"
#import <AuthenticationServices/AuthenticationServices.h>
#import "OauthEssentials-Swift.h"


@implementation OauthEssentials {
  OauthEssentialsModule *_sModule;
}

- (instancetype)init
{
  self = [super init];
  if (self) {
    __weak OauthEssentials *weakSelf = self;

    _sModule = [[OauthEssentialsModule alloc]
                initOnCredentialSuccess:^(NSDictionary * _Nonnull value) {
      [weakSelf emitOnCredentialSuccess:value];
    } onCredentialFailure:^(NSDictionary * _Nonnull value) {
      [weakSelf emitOnCredentialFailure:value];
    } onAppleIdCredentialRevoked:^(NSDictionary * _Nonnull value) {
      [weakSelf emitOnAppleIdCredentialRevoked:value];
    }];
  }
  return self;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeOauthEssentialsSpecJSI>(params);
}

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

- (void)googleSilentSignIn:(NSString *)clientId
                   options:(NSDictionary *)options
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject
{
  [_sModule googleSilentSignIn:clientId
                       options:options
                      resolver:resolve
                      rejecter:reject];
}

- (void)signOut:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject
{
  [_sModule signOut:resolve rejecter:reject];
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
  [_sModule getPassword:resolve
                            rejecter:reject];
}


- (void)hybridSignIn:(NSString *)clientId
             options:(NSDictionary *)options
             resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  [_sModule hybridSignIn:clientId options:options resolver:resolve rejecter:reject];
}

- (void)appleSignIn:(NSString *)webAndroidUrl
            options:(NSDictionary *)options
            resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
    [_sModule appleSignIn:webAndroidUrl options:options resolver:resolve rejecter:reject];
}

- (void)getAppleIdCredentialState:(NSString *)userId
                          resolve:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject {
    [_sModule getAppleIdCredentialState:userId resolver:resolve rejecter:reject];
}

- (void)createPassKey:(NSDictionary *)options
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject {
    [_sModule createPassKey:options resolver:resolve rejecter:reject];
}

- (void)getPassKey:(NSDictionary *)options
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
    [_sModule getPassKey:options resolver:resolve rejecter:reject];
}

- (void)cancelPassKeyAutoFill:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject {
    [_sModule cancelPassKeyAutoFill:resolve rejecter:reject];
}

- (void)generatePkce:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject {
    [_sModule generatePkce:resolve rejecter:reject];
}

- (void)openAuthSession:(NSString *)url
                options:(NSDictionary *)options
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
    [_sModule openAuthSession:url options:options resolver:resolve rejecter:reject];
}

- (facebook::react::ModuleConstants<JS::NativeOauthEssentials::Constants>) constantsToExport {
  return (facebook::react::ModuleConstants<JS::NativeOauthEssentials::Constants>)[_sModule getConstants];
}

@end
