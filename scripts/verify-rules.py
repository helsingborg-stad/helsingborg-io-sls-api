#!/usr/bin/env python3

# Helper script to verify discrepancies for event-bridge rules between remote (aws) and local definitions

import json
import subprocess
import glob
import os
import yaml


class DummyYamlLoader(yaml.SafeLoader):
    '''
    Custom loader to handle custom tags (like !ImportValue) in yaml files.
    They are ignored (their value is set to None) as they are not used by this script
    '''

    def __init__(self, stream) -> None:
        super().__init__(stream)
        self.add_constructor(
            "!ImportValue", DummyYamlLoader.dummy_yaml_constructor)
        self.add_constructor(
            "!Sub", DummyYamlLoader.dummy_yaml_constructor)

    def dummy_yaml_constructor(loader, node):
        return None


def run_cmd(cmd):
    result = subprocess.run(cmd, capture_output=True)
    return result.stdout.decode("utf-8")


def get_aws_rules(startToken: str = None) -> list[dict]:
    '''
    Get the list of rules in AWS. May recursively call itself to aggregate
    a list to handle pagination.
    '''

    cmds = ["aws", "events", "list-rules", "--max-items", "30", "--starting-token",
            startToken] if startToken else ["aws", "events", "list-rules", "--max-items", "30"]

    raw = run_cmd(cmds)
    jsonData = json.loads(raw)
    rules = jsonData["Rules"]

    if "NextToken" in jsonData:
        nextToken = jsonData["NextToken"]
        rules = rules + get_aws_rules(nextToken)

    return rules


def parse_local_rules(ymlPath: str) -> list[str]:
    '''
    Parse a local serverless.yml file and extract its event-bridge rules.

    Name follows a format like <service>-dev-<function>-rule-<index> in order
    to approximate actual rule names.
    '''

    parsed = None
    with open(ymlPath, mode="r", encoding="utf-8") as ymlFile:
        parsed = yaml.load(ymlFile, DummyYamlLoader)

    if parsed:
        ymlDirName = os.path.split(os.path.split(ymlPath)[0])[1]
        print(f"parsing {ymlPath}")

        if "functions" in parsed:
            functions = parsed["functions"]
            return [f"{ymlDirName}-dev-{funcName}-rule-{i+1}" for funcName in functions.keys() if "events" in functions[funcName] for i in range(len([e for e in functions[funcName]["events"] if "eventBridge" in e]))]

    print(f"unable to parse {ymlPath}")
    return []


def get_local_rules() -> list[str]:
    ymlFiles = glob.glob(
        "../services/**/serverless.yml")

    print(f"found {len(ymlFiles)} local serverless.yml files")
    return [rule for ymlPath in ymlFiles for rule in parse_local_rules(ymlPath)]


if __name__ == "__main__":
    existing_rules = get_aws_rules()
    existing_rule_names = [rule["Name"] for rule in existing_rules]

    local_rules = get_local_rules()

    print(
        f"remote rules={len(existing_rule_names)}, local rules={len(local_rules)}")
    print()

    print("remote rules:")
    for rule in existing_rule_names:
        print(f"\t{rule}")

    print()
    print("local rules (names are approximate):")
    for rule in local_rules:
        print(f"\t{rule}")

    intersection = set(existing_rule_names) & set(local_rules)
    remote_unique = set(existing_rule_names) - set(local_rules)
    local_unique = set(local_rules) - set(existing_rule_names)

    print()
    print(f"rules on both remote and local:")
    for rule in intersection:
        print(f"\t{rule}")

    print()
    print(f"rules only on remote:")
    for rule in remote_unique:
        print(f"\t{rule}")

    print()
    print(f"rules only on local:")
    for rule in local_unique:
        print(f"\t{rule}")
