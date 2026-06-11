#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int n;
vector<vector<int>> adj;
vector<int> sz;
vector<int> centroids;

void get_sz(int u, int p) {
    sz[u] = 1;
    bool is_centroid = true;
    for (int v : adj[u]) {
        if (v != p) {
            get_sz(v, u);
            sz[u] += sz[v];
            if (sz[v] > n / 2) {
                is_centroid = false;
            }
        }
    }
    if (n - sz[u] > n / 2) {
        is_centroid = false;
    }
    if (is_centroid) {
        centroids.push_back(u);
    }
}

// Find a leaf in the subtree of u (excluding parent p)
pair<int, int> find_leaf(int u, int p) {
    bool is_leaf = true;
    for (int v : adj[u]) {
        if (v != p) {
            is_leaf = false;
            return find_leaf(v, u);
        }
    }
    return {p, u}; // returns parent and leaf
}

void solve() {
    cin >> n;
    adj.assign(n + 1, vector<int>());
    sz.assign(n + 1, 0);
    centroids.clear();

    for (int i = 0; i < n - 1; ++i) {
        int u, v;
        cin >> u >> v;
        adj[u].push_back(v);
        adj[v].push_back(u);
    }

    if (n <= 2) {
        // Only one edge or <=2 nodes, already unique/connected
        // Output dummy operation
        int u = 1, v = adj[1][0];
        cout << u << " " << v << "\n";
        cout << u << " " << v << "\n";
        return;
    }

    get_sz(1, 0);

    if (centroids.size() == 1) {
        // Unique centroid, output any dummy operation (e.g. cut and paste the same edge)
        int u = 1;
        int v = adj[1][0];
        cout << u << " " << v << "\n";
        cout << u << " " << v << "\n";
    } else {
        // Two centroids. They must be adjacent.
        int c1 = centroids[0];
        int c2 = centroids[1];

        // Find a leaf in c1's component when edge (c1, c2) is removed
        auto [parent, leaf] = find_leaf(c1, c2);

        // Cut (parent, leaf) and add (c2, leaf)
        cout << parent << " " << leaf << "\n";
        cout << c2 << " " << leaf << "\n";
    }
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int t;
    if (cin >> t) {
        while (t--) {
            solve();
        }
    }
    return 0;
}
