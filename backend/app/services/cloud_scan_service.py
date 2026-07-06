from typing import Any, Dict, List, Optional
from datetime import datetime

CloudAsset = Dict[str, Any]


async def scan_aws(access_key_id: str = "", secret_access_key: str = "", region: str = "us-east-1") -> List[CloudAsset]:
    if not access_key_id or not secret_access_key:
        return []
    assets: List[CloudAsset] = []
    try:
        import aioboto3
        session = aioboto3.Session(
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region,
        )
        async with session.client("ec2") as ec2:
            paginator = ec2.get_paginator("describe_instances")
            async for page in paginator.paginate():
                for reservation in page.get("Reservations", []):
                    for instance in reservation.get("Instances", []):
                        name_tag = ""
                        if instance.get("Tags"):
                            for tag in instance["Tags"]:
                                if tag["Key"] == "Name":
                                    name_tag = tag["Value"]
                        assets.append({
                            "provider": "aws",
                            "type": "ec2",
                            "id": instance.get("InstanceId", ""),
                            "name": name_tag,
                            "state": instance.get("State", {}).get("Name", "unknown"),
                            "public_ip": instance.get("PublicIpAddress"),
                            "private_ip": instance.get("PrivateIpAddress"),
                            "launch_time": instance.get("LaunchTime", "").isoformat() if instance.get("LaunchTime") else "",
                            "instance_type": instance.get("InstanceType", ""),
                            "region": region,
                        })

        async with session.client("lambda") as lambda_client:
            paginator = lambda_client.get_paginator("list_functions")
            async for page in paginator.paginate():
                for func in page.get("Functions", []):
                    assets.append({
                        "provider": "aws",
                        "type": "lambda",
                        "id": func.get("FunctionArn", ""),
                        "name": func.get("FunctionName", ""),
                        "runtime": func.get("Runtime", ""),
                        "last_modified": func.get("LastModified", ""),
                        "region": region,
                    })

        async with session.client("ecs") as ecs:
            clusters = await ecs.list_clusters()
            for cluster_arn in clusters.get("clusterArns", []):
                tasks = await ecs.list_tasks(cluster=cluster_arn)
                for task_arn in tasks.get("taskArns", []):
                    assets.append({
                        "provider": "aws",
                        "type": "ecs_task",
                        "id": task_arn,
                        "cluster": cluster_arn,
                        "region": region,
                    })

    except ImportError:
        print("[CLOUD] aioboto3 not installed — skipping AWS scan")
    except Exception as e:
        print(f"[CLOUD] AWS scan error: {e}")
    return assets


async def scan_gcp(credentials_json: str = "", project_id: str = "") -> List[CloudAsset]:
    if not credentials_json or not project_id:
        return []
    assets: List[CloudAsset] = []
    try:
        import json
        from google.oauth2.service_account import Credentials
        from google.cloud import compute_v1, run_v2

        creds = Credentials.from_service_account_info(json.loads(credentials_json))

        compute_client = compute_v1.InstancesClient(credentials=creds)
        request = compute_client.aggregated_list(request={"project": project_id})
        for zone, response_data in request:
            instances = response_data.instances
            for instance in instances:
                assets.append({
                    "provider": "gcp",
                    "type": "compute",
                    "id": instance.id,
                    "name": instance.name,
                    "status": instance.status,
                    "zone": zone,
                    "machine_type": instance.machine_type.split("/")[-1] if instance.machine_type else "",
                })

        run_client = run_v2.ServicesClient(credentials=creds)
        parent = f"projects/{project_id}/locations/-"
        try:
            services = run_client.list_services(parent=parent)
            for svc in services:
                assets.append({
                    "provider": "gcp",
                    "type": "cloud_run",
                    "id": svc.name,
                    "name": svc.display_name or svc.name.split("/")[-1],
                    "uri": svc.uri or "",
                })
        except Exception as e:
            print(f"[CLOUD] GCP Cloud Run scan error: {e}")

    except ImportError:
        print("[CLOUD] google-cloud not installed — skipping GCP scan")
    except Exception as e:
        print(f"[CLOUD] GCP scan error: {e}")
    return assets


async def scan_azure(client_id: str = "", client_secret: str = "", tenant_id: str = "", subscription_id: str = "") -> List[CloudAsset]:
    if not all([client_id, client_secret, tenant_id, subscription_id]):
        return []
    assets: List[CloudAsset] = []
    try:
        from azure.identity import ClientSecretCredential
        from azure.mgmt.compute import ComputeManagementClient
        from azure.mgmt.containerinstance import ContainerInstanceManagementClient

        credential = ClientSecretCredential(tenant_id, client_id, client_secret)
        compute_client = ComputeManagementClient(credential, subscription_id)
        for vm in compute_client.virtual_machines.list_all():
            assets.append({
                "provider": "azure",
                "type": "vm",
                "id": vm.id or "",
                "name": vm.name or "",
                "location": vm.location or "",
                "provisioning_state": vm.provisioning_state or "",
            })

        ci_client = ContainerInstanceManagementClient(credential, subscription_id)
        for group in ci_client.container_groups.list():
            assets.append({
                "provider": "azure",
                "type": "container_group",
                "id": group.id or "",
                "name": group.name or "",
                "location": group.location or "",
                "provisioning_state": group.provisioning_state or "",
            })

    except ImportError:
        print("[CLOUD] azure-identity/mgmt not installed — skipping Azure scan")
    except Exception as e:
        print(f"[CLOUD] Azure scan error: {e}")
    return assets


async def scan_all_clouds(creds: Dict[str, str]) -> Dict[str, List[CloudAsset]]:
    results: Dict[str, List[CloudAsset]] = {}

    aws_keys = creds.get("aws", {})
    results["aws"] = await scan_aws(
        access_key_id=aws_keys.get("access_key_id", ""),
        secret_access_key=aws_keys.get("secret_access_key", ""),
        region=aws_keys.get("region", "us-east-1"),
    )

    gcp_keys = creds.get("gcp", {})
    results["gcp"] = await scan_gcp(
        credentials_json=gcp_keys.get("credentials_json", ""),
        project_id=gcp_keys.get("project_id", ""),
    )

    azure_keys = creds.get("azure", {})
    results["azure"] = await scan_azure(
        client_id=azure_keys.get("client_id", ""),
        client_secret=azure_keys.get("client_secret", ""),
        tenant_id=azure_keys.get("tenant_id", ""),
        subscription_id=azure_keys.get("subscription_id", ""),
    )

    return results
