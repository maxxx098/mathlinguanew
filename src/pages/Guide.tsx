import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, GraduationCap, Users, Heart, Trophy, Target, Flame, Star, ClipboardList, MessageCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const Guide = () => {
  const navigate = useNavigate();

  return (
    <div className="pb-24 pt-4 px-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-xl font-bold">Guidebook</h1>
            <p className="text-sm text-muted-foreground">Everything you need to know</p>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="app" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="app" className="text-xs">How to Use</TabsTrigger>
          <TabsTrigger value="math" className="text-xs">Math Guide</TabsTrigger>
          <TabsTrigger value="teacher" className="text-xs">For Teachers</TabsTrigger>
        </TabsList>

        {/* HOW TO USE TAB */}
        <TabsContent value="app" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">Getting Started</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Mathlingua helps you master algebraic translations through gamified lessons. Here's how to get started:</p>
              <ol className="list-decimal pl-4 space-y-2">
                <li><strong className="text-foreground">Create an account</strong> — Sign up as a Learner or Teacher.</li>
                <li><strong className="text-foreground">Start learning</strong> — Tap on levels in your Learning Path to begin.</li>
                <li><strong className="text-foreground">Answer questions</strong> — Each level has multiple choice, fill-in-the-blank, and expression-building questions.</li>
                <li><strong className="text-foreground">Track progress</strong> — See your stats on the home screen and profile.</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                  <Heart className="h-4 w-4 text-destructive" />
                </div>
                <CardTitle className="text-base">Lives System</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>You start with <Badge variant="secondary">5 lives ❤️</Badge>. Each wrong answer costs one life.</p>
              <p>Lives regenerate over time — one life every 30 minutes. If you run out, wait for them to recharge or come back later!</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                  <Flame className="h-4 w-4 text-warning" />
                </div>
                <CardTitle className="text-base">Daily Challenges</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>A new challenge appears every day on your home screen. Complete it to sharpen your skills and build a streak!</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                  <Trophy className="h-4 w-4 text-success" />
                </div>
                <CardTitle className="text-base">Badges & Achievements</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Earn badges as you progress. Visit your Profile → Badges to see them all:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">👣 First Steps</Badge>
                <Badge variant="outline">⭐ Rising Star</Badge>
                <Badge variant="outline">🧠 Algebra Pro</Badge>
                <Badge variant="outline">👑 Master Mind</Badge>
                <Badge variant="outline">💯 Perfect Score</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">Community</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>Share tips, ask questions, and cheer on your classmates in the Community tab. You can create posts, reply, and heart others' contributions.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MATH CONCEPTS TAB */}
        <TabsContent value="math" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">What is Algebraic Translation?</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Algebraic translation is the process of converting <strong className="text-foreground">word problems</strong> into <strong className="text-foreground">mathematical expressions</strong> and equations.</p>
              <p>For example: <em>"Five more than a number"</em> becomes <Badge variant="secondary" className="font-mono">x + 5</Badge></p>
            </CardContent>
          </Card>

          <Accordion type="single" collapsible className="space-y-2">
            <AccordionItem value="keywords" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold">Key Words & Their Operations</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-3">
                <div>
                  <p className="font-semibold text-foreground mb-1">Addition (+)</p>
                  <p>sum, plus, more than, increased by, added to, total</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Subtraction (−)</p>
                  <p>difference, minus, less than, decreased by, subtracted from, fewer</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Multiplication (×)</p>
                  <p>product, times, of, multiplied by, twice, double, triple</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Division (÷)</p>
                  <p>quotient, divided by, ratio, per, split equally</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Equals (=)</p>
                  <p>is, equals, is equal to, results in, gives</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="examples" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold">Practice Examples</AccordionTrigger>
              <AccordionContent className="text-sm space-y-3">
                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  <p className="text-muted-foreground">"Three times a number decreased by seven"</p>
                  <p className="font-mono font-semibold text-primary">3x − 7</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  <p className="text-muted-foreground">"The sum of a number and twelve is twenty"</p>
                  <p className="font-mono font-semibold text-primary">x + 12 = 20</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  <p className="text-muted-foreground">"Twice a number added to five"</p>
                  <p className="font-mono font-semibold text-primary">2x + 5</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  <p className="text-muted-foreground">"A number divided by four equals nine"</p>
                  <p className="font-mono font-semibold text-primary">x / 4 = 9</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="variables" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold">Understanding Variables</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>A <strong className="text-foreground">variable</strong> (like x, y, n) represents an unknown number. When a problem says "a number" or "an unknown value," we use a variable.</p>
                <p>Common phrases: "a number," "a certain value," "an unknown quantity" — all translate to a variable.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="order" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold">Order of Operations (PEMDAS)</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>When building expressions, remember the order:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li><strong className="text-foreground">P</strong>arentheses first</li>
                  <li><strong className="text-foreground">E</strong>xponents</li>
                  <li><strong className="text-foreground">M</strong>ultiplication & <strong className="text-foreground">D</strong>ivision (left to right)</li>
                  <li><strong className="text-foreground">A</strong>ddition & <strong className="text-foreground">S</strong>ubtraction (left to right)</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tips" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold">Tips for Translating</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Read the entire phrase before writing anything.</li>
                  <li>Identify the unknown — assign it a variable.</li>
                  <li>Look for key words that indicate operations.</li>
                  <li>Watch out for "less than" — it reverses order! ("5 less than x" = x − 5)</li>
                  <li>Check your expression by reading it back as words.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* TEACHER TAB */}
        <TabsContent value="teacher" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">Managing Classes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ol className="list-decimal pl-4 space-y-2">
                <li><strong className="text-foreground">Create a class</strong> — Go to the Class tab and tap "Create Class." Give it a name and you'll get a unique class code.</li>
                <li><strong className="text-foreground">Share the code</strong> — Give students your class code. They enter it during signup or in their Class tab.</li>
                <li><strong className="text-foreground">Monitor progress</strong> — View each student's completed levels, scores, and activity from your dashboard.</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                  <ClipboardList className="h-4 w-4 text-success" />
                </div>
                <CardTitle className="text-base">Assignments</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Create assignments for your class with custom questions. Students will see them in their Class tab and can submit answers.</p>
              <p>You can review submissions and scores from the Class management area.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                  <Star className="h-4 w-4 text-warning" />
                </div>
                <CardTitle className="text-base">Student Progress</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Your teacher dashboard shows:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Total students enrolled in your classes</li>
                <li>Number of classes and assignments created</li>
                <li>Recent student activity feed</li>
              </ul>
              <p>Tap on a student's name to view their detailed profile and learning progress.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <HelpCircle className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">Tips for Teachers</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Encourage students to complete the daily challenge each day.</li>
                <li>Use the community board to post tips and encouragement.</li>
                <li>Check the activity feed regularly to see who might need extra help.</li>
                <li>Create assignments that align with the levels students are currently on.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Guide;
