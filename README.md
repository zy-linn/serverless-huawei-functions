# Huawei Function Compute Serverless Plugin
This plugin enables Huawei Function Compute support within the Serverless Framework.

# Getting started
### Pre-requisites
- Node.js 12.x or above
- Serverless CLI v1.26.1+. You can run `npm i -g serverless` if you don't already have it.
- An Huawei cloud account.

### Create a new Function App

```bash
# Create Huawei Function App from template
# Templates include: huawei-nodejs
$ sls create -t huawei-nodejs -p <appName>
# Move into project directory
$ cd <appName>
# Install dependencies (including this plugin)
$ npm install
```
The `serverless.yml` file contains the configuration for your service.

```yaml
service: fg-service # service name

frameworkVersion: "3"

provider: # provider information
  name: huawei
  credentials: ~/.fg/credentials # 绝对地址，默认为 ~/credentials
  runtime: Node.js14.18 # 可以指定华为云支持的Runtime， 默认Node.js14.18
  # you can overwrite defaults here  
  # stage: dev # 阶段，默认为 dev
  # package: default
  # memorySize: 256 # 默认256M，优先级：函数设置>默认设置
  # timeout: 30 # 默认30s，优先级：函数设置>默认设置
  # region: cn-north-4 # 默认cn-north-4，优先级：函数设置>默认设置
  # environment: # 环境变量，可选
  #   variables:
  #     ENV_FIRST: env1
  #     ENV_SECOND: env2

plugins:
  - serverless-huawei-functions

functions:
  hello_world:
    handler: index.handler
    # you can overwrite config here  
    # description: Huawei Serverless Cloud Function
    # package: default
    # memorySize: 256
    # timeout: 30
    # environment:
    #   variables:
    #     ENV_FIRST: env1
    #     ENV_SECOND: env2
```

In order to deploy this function, we need the credentials with permissions to access Huawei Function Compute. 
Please create a `credentials` file and configure the credentials in it. 
Here is an example `credentials` file:

```ini
access_key_id=xxxxxxxx
secret_access_key=xxxxxxxxxxxxxxxxxxxx
```

### Deploy Your Function App

```bash
$ sls deploy
```

### Deleting Your Function App

```bash
$ sls remove
```


# License
MIT
