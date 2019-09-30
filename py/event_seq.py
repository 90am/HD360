import pandas as pd

def get_new_node(name, seq_id, delta):
    return {'name': name, 'children': [], 'meta': {'count': 1, 'ids': [seq_id], 'time':[delta], 'outcome': {}}}


def add_outcome(event, node):
    if event.outcome not in node['meta']['outcome'].keys():
        node['meta']['outcome'][event.outcome] = []
    node['meta']['outcome'][event.outcome].append(event.seq_id)


def add_event(event, node, prev_timestamp):
    delta = 0
    if(prev_timestamp != 0):
        prev_t = pd.Timestamp(prev_timestamp)
        t = pd.Timestamp(event.timestamp)
        delta = (t - prev_t).total_seconds()
    
    result = node
    n = None
    for c in node['children']:
        if(c['name'] == event.event_type):
            n = c
    if(n != None):
        n['meta']['count'] += 1
        n['meta']['ids'].append(event.seq_id)
        n['meta']['time'].append(delta)
        add_outcome(event, n)
        result = n
    else:
        n = get_new_node(event.event_type, event.seq_id, delta)
        add_outcome(event, n)
        node['children'].append(n)
        result = n
        
    return result

def stats(node):
    node['meta']['avg_time'] = sum(node['meta']['time']) / len(node['meta']['time'])
    outcome_ratio = {}
    for o in node['meta']['outcome'].keys():
        outcome_ratio[o] = len(node['meta']['outcome'][o])/len(node['meta']['ids'])
    node['meta']['outcome_ratio'] = outcome_ratio

def clean(node): 
    if(len(node['children']) == 0):
        node['size'] = node['meta']['count']
        del node['children']
    else:
        for c in node['children']:
            clean(c)
    stats(node)


def aggregate(df):
    df.sort_values(by=['seq_id', 'timestamp'], inplace=True)
    result = {'name': 'all', 'children': [], 'meta': {'count': 0, 'ids': [], 'time': [], 'outcome': {}}}

    current_id = None
    current_node = None
    prev = None

    for index, row in df.iterrows():
        if(row.seq_id == current_id):
            current_node = add_event(row, current_node, prev.timestamp)
        else:
            current_id = row.seq_id
            current_node = add_event(row, result, 0)
            result['meta']['count'] += 1
            result['meta']['ids'].append(row.seq_id)
            result['meta']['time'].append(0)
        prev = row
        
    clean(result)
    stats(result)
    return result
